import { z } from 'zod';

/** Ruta base del sitio (next.config.ts). Todas las rutas internas cuelgan de aquí. */
export const BASE_PATH = '/ViajaCol';

export type SiteLocale = 'es' | 'en';

const PROBE_ORIGIN = 'https://viajacol.invalid';
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/** Portada del idioma: `/ViajaCol` o `/ViajaCol/en`. */
export function homeFor(locale: SiteLocale): string {
  return locale === 'en' ? `${BASE_PATH}/en` : BASE_PATH;
}

function isUnderBase(pathname: string): boolean {
  return pathname === BASE_PATH || pathname.startsWith(`${BASE_PATH}/`);
}

/**
 * Dirección de regreso tras iniciar sesión (`volver`): solo rutas internas del sitio. Se resuelve como
 * lo haría el navegador (puntos, `%2e`, barras invertidas) y se exige que siga dentro de `/ViajaCol`.
 */
export const returnPathSchema = z
  .string()
  .max(512)
  .refine((value) => value.startsWith('/') && !value.startsWith('//'), 'ruta-externa')
  .refine((value) => !value.includes('\\') && !CONTROL_CHARS.test(value), 'caracteres-invalidos')
  .transform((value, ctx) => {
    const url = new URL(value, PROBE_ORIGIN);
    if (url.origin !== PROBE_ORIGIN || !isUnderBase(url.pathname)) {
      ctx.addIssue({ code: 'custom', message: 'fuera-del-sitio' });
      return z.NEVER;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  });

/** Devuelve `volver` si es una ruta interna válida; si no, la portada del idioma. */
export function safeReturnPath(value: string | null | undefined, locale: SiteLocale): string {
  const parsed = returnPathSchema.safeParse(value ?? '');
  return parsed.success ? parsed.data : homeFor(locale);
}
