import { describe, expect, it } from 'vitest';
import {
  type ItemKind,
  addCatalogItem,
  moveItem,
  newTrip,
  toTripView,
  upsertNote,
} from '@/domain/trip';
import { buildIcs, escapeText, foldLine, icsFileName } from './ics';

const now = new Date('2026-11-27T15:04:05.000Z');
const kinds: Record<ItemKind, string> = {
  sitio: 'Sitio',
  fiesta: 'Fiesta',
  plato: 'Plato',
  experiencia: 'Experiencia',
  nota: 'Nota',
};
const labels = {
  day: (n: number) => `Día ${n}`,
  kind: (kind: ItemKind) => kinds[kind],
  empty: 'Sin elementos.',
  title: (item: { title: string }) => item.title,
};
const bytes = (text: string) => new TextEncoder().encode(text).length;
const unfold = (ics: string) => ics.replace(/\r\n /g, '');

describe('escapeText (RFC 5545, 3.3.11)', () => {
  it('escapa barra invertida, punto y coma, coma y saltos de línea', () => {
    expect(escapeText('a\\b;c,d\ne\r\nf')).toBe('a\\\\b\\;c\\,d\\ne\\nf');
  });
});

describe('foldLine (RFC 5545, 3.1)', () => {
  it('deja igual una línea de hasta 75 octetos', () => {
    const line = `SUMMARY:${'a'.repeat(67)}`;
    expect(foldLine(line)).toBe(line);
  });

  it('pliega a 75 octetos y cada continuación empieza con un espacio', () => {
    const line = `DESCRIPTION:${'a'.repeat(200)}`;
    const parts = foldLine(line).split('\r\n');
    expect(bytes(parts[0]!)).toBe(75);
    for (const part of parts.slice(1)) {
      expect(part.startsWith(' ')).toBe(true);
      expect(bytes(part)).toBeLessThanOrEqual(75);
    }
    expect(unfold(foldLine(line))).toBe(line);
  });

  it('no parte caracteres de varios octetos', () => {
    const line = `SUMMARY:${'ñá'.repeat(60)}`;
    const folded = foldLine(line);
    for (const part of folded.split('\r\n')) expect(bytes(part)).toBeLessThanOrEqual(75);
    expect(unfold(folded)).toBe(line);
  });
});

describe('buildIcs (US6, escenario 3)', () => {
  let trip = toTripView(
    newTrip({
      sub: 'sub-ana',
      tripId: 'viaje-1',
      details: {
        name: 'Eje cafetero',
        startDate: '2026-12-20',
        endDate: '2026-12-22',
        travelers: 2,
        budget: 0,
      },
      now,
    }),
  );
  trip = addCatalogItem(
    trip,
    { id: 'a', kind: 'sitio', slug: 'cocora', title: 'Valle de Cocora' },
    now,
  );
  trip = moveItem(trip, 'a', 0, 0, now);
  trip = upsertNote(
    trip,
    { id: 'n', title: 'Vuelo, temprano', text: 'Sale 7:10; puerta 3', day: 0 },
    now,
  );
  const ics = buildIcs(trip, labels, now);
  const text = unfold(ics);

  it('usa CRLF y ninguna línea pasa de 75 octetos', () => {
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    for (const line of ics.split('\r\n')) expect(bytes(line)).toBeLessThanOrEqual(75);
  });

  it('tiene un evento de día completo por fecha', () => {
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(text).toContain('DTSTART;VALUE=DATE:20261220\r\nDTEND;VALUE=DATE:20261221');
    expect(text).toContain('DTSTART;VALUE=DATE:20261222\r\nDTEND;VALUE=DATE:20261223');
    expect(text).toContain('UID:viaje-1-3@aisergio.dev');
    expect(text).toContain('DTSTAMP:20261127T150405Z');
  });

  it('lista los elementos del día escapados y marca los días vacíos', () => {
    expect(text).toContain('SUMMARY:Eje cafetero · Día 1');
    expect(text).toContain(
      'DESCRIPTION:Sitio: Valle de Cocora\\nNota: Vuelo\\, temprano — Sale 7:10\\; puerta 3',
    );
    expect(text).toContain('DESCRIPTION:Sin elementos.');
  });

  it('empieza y termina el calendario con su nombre', () => {
    expect(text.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(text).toContain('X-WR-CALNAME:Eje cafetero');
    expect(text.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
});

describe('icsFileName', () => {
  it('quita tildes y símbolos', () => {
    expect(icsFileName('Eje Cafetero en diciembre ☕')).toBe('eje-cafetero-en-diciembre.ics');
    expect(icsFileName('¡¿!')).toBe('mi-viaje.ics');
  });
});
