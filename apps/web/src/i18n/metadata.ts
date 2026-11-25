import type { Metadata } from 'next';
import type { Locale } from 'next-intl';

const BASE_PATH = '/ViajaCol';

/** URL pública de una ruta sin idioma (`/sitios`) en el idioma dado. */
export function localizedPath(locale: Locale, path: string): string {
  const clean = path === '/' ? '' : path;
  return locale === 'es' ? `${BASE_PATH}${clean}` || BASE_PATH : `${BASE_PATH}/en${clean}`;
}

/** `canonical` y alternativas `hreflang` para la misma sección en ambos idiomas. */
export function buildAlternates(locale: Locale, path: string): Metadata['alternates'] {
  return {
    canonical: localizedPath(locale, path),
    languages: {
      'es-CO': localizedPath('es', path),
      en: localizedPath('en', path),
      'x-default': localizedPath('es', path),
    },
  };
}
