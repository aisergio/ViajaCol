import { hasLocale, type Locale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from './routing';

/** Valida el segmento `[locale]`; si no es un idioma soportado, responde 404. */
export function resolveLocale(value: string): Locale {
  if (!hasLocale(routing.locales, value)) notFound();
  return value;
}

/** Atributo `lang` del documento para cada idioma. */
export function htmlLang(locale: Locale): string {
  return locale === 'es' ? 'es-CO' : 'en';
}
