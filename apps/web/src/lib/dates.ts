/** Fechas y meses del catálogo, con la zona horaria de Colombia para que servidor y cliente coincidan. */
const TIME_ZONE = 'America/Bogota';

function intlLocale(locale: string): string {
  return locale === 'es' ? 'es-CO' : 'en-US';
}

function capitalize(text: string, locale: string): string {
  return text.charAt(0).toLocaleUpperCase(intlLocale(locale)) + text.slice(1);
}

/** «Enero», «January». */
export function monthName(month: number, locale: string, style: 'long' | 'short' = 'long'): string {
  const name = new Intl.DateTimeFormat(intlLocale(locale), { month: style, timeZone: 'UTC' })
    .format(new Date(Date.UTC(2026, month - 1, 15)))
    .replace('.', '');
  return capitalize(name, locale);
}

/** Meses de una fiesta en corto: «Feb · Mar». */
export function monthsLabel(months: readonly number[], locale: string): string {
  return months.map((month) => monthName(month, locale, 'short')).join(' · ');
}

/** Fecha ISO (`2026-11-20`) en formato largo: «20 de noviembre de 2026». */
export function formatDate(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: 'long',
    timeZone: TIME_ZONE,
  }).format(new Date(`${isoDate}T12:00:00-05:00`));
}
