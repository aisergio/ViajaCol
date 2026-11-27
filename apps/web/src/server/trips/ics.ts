import {
  type ItemKind,
  type TripItem,
  type TripView,
  dayCount,
  dayDate,
  groupByDay,
} from '@/domain/trip';

/**
 * Itinerario en iCalendar (RFC 5545; US6, escenario 3; research D-07): un evento de día completo por
 * fecha, con los elementos del día en la descripción. Google Calendar y Outlook lo importan (SC-005).
 */
export interface IcsLabels {
  /** «Día 1». */
  day: (n: number) => string;
  kind: (kind: ItemKind) => string;
  /** Texto de un día sin elementos. */
  empty: string;
  /** Nombre que se muestra de cada elemento (el del catálogo en el idioma pedido o el guardado). */
  title: (item: TripItem) => string;
}

const CRLF = '\r\n';
const encoder = new TextEncoder();

/** Escapa un valor de texto (sección 3.3.11): barra invertida, punto y coma, coma y saltos de línea. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Pliega una línea a 75 octetos (sección 3.1) sin partir caracteres UTF-8: cada continuación empieza
 * con un espacio, que también cuenta.
 */
export function foldLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let size = 0;
  let limit = 75;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (size + bytes > limit) {
      parts.push(current);
      current = char;
      size = bytes;
      limit = 74;
    } else {
      current += char;
      size += bytes;
    }
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

const compactDate = (isoDate: string) => isoDate.replaceAll('-', '');

/** `20261127T153000Z` (sección 3.3.5, hora UTC). */
function stamp(now: Date): string {
  return `${now.toISOString().slice(0, 19).replace(/[-:]/g, '')}Z`;
}

function describe(items: readonly TripItem[], labels: IcsLabels): string {
  if (!items.length) return labels.empty;
  return items
    .map((item) => {
      const line = `${labels.kind(item.kind)}: ${labels.title(item)}`;
      return item.kind === 'nota' && item.text ? `${line} — ${item.text}` : line;
    })
    .join('\n');
}

export function buildIcs(trip: TripView, labels: IcsLabels, now: Date): string {
  const groups = groupByDay(trip.items);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Viaja Colombia//Mi viaje//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(trip.name)}`,
  ];
  for (let day = 0; day < dayCount(trip.startDate, trip.endDate); day++) {
    const date = dayDate(trip.startDate, day);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${trip.tripId}-${day + 1}@aisergio.dev`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;VALUE=DATE:${compactDate(date)}`,
      `DTEND;VALUE=DATE:${compactDate(dayDate(trip.startDate, day + 1))}`,
      `SUMMARY:${escapeText(`${trip.name} · ${labels.day(day + 1)}`)}`,
      `DESCRIPTION:${escapeText(describe(groups.get(day) ?? [], labels))}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** Nombre de archivo ASCII: «Eje Cafetero en diciembre» → `eje-cafetero-en-diciembre.ics`. */
export function icsFileName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'mi-viaje'}.ics`;
}
