import { BASE_PATH } from './return-path';

/** Prefijo de las cookies de Better Auth (data-model: Sesión). */
export const COOKIE_PREFIX = 'viajacol';
/** Cookie indicadora, legible por JavaScript y sin datos (research D-05). */
export const SESSION_HINT_COOKIE = `${COOKIE_PREFIX}.con_sesion`;
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 7;

/** Nombres de las cookies de sesión. Con HTTPS, Better Auth les antepone `__Secure-`. */
export function sessionCookieNames(secure: boolean): string[] {
  const prefix = secure ? '__Secure-' : '';
  return [`${prefix}${COOKIE_PREFIX}.session_token`, `${prefix}${COOKIE_PREFIX}.session_data`];
}

/** ¿Trae la petición alguna cookie de sesión? Comprobación barata, sin validar la firma. */
export function hasSessionCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  const names = [...sessionCookieNames(true), ...sessionCookieNames(false)];
  return cookieHeader.split(';').some((pair) => names.includes(pair.split('=')[0]?.trim() ?? ''));
}

/** Cabecera Set-Cookie de la cookie indicadora: `on` la crea por 7 días y `off` la borra. */
export function sessionHintCookie(state: 'on' | 'off', secure: boolean): string {
  const attributes = [
    `Path=${BASE_PATH}`,
    'SameSite=Lax',
    state === 'on' ? `Max-Age=${SESSION_MAX_AGE_S}` : 'Max-Age=0',
  ];
  if (secure) attributes.push('Secure');
  return `${SESSION_HINT_COOKIE}=${state === 'on' ? '1' : ''}; ${attributes.join('; ')}`;
}

/** Cabeceras Set-Cookie que borran la sesión y el indicador (salir y eliminar la cuenta). */
export function clearSessionCookies(secure: boolean): string[] {
  const expire = (name: string) =>
    `${name}=; Path=${BASE_PATH}; Max-Age=0; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
  return [...sessionCookieNames(secure).map(expire), sessionHintCookie('off', secure)];
}
