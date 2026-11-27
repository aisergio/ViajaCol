/**
 * Modelo de cliente de la cuenta. El navegador no puede leer la sesión (cookies HttpOnly): solo ve la
 * cookie indicadora y, si existe, le pregunta el nombre al servidor (research D-05).
 */
export const SESSION_HINT_COOKIE = 'viajacol.con_sesion';
export const BASE_PATH = '/ViajaCol';

export type AccountLocale = 'es' | 'en';

/** ¿Hay indicador de sesión en `document.cookie`? */
export function hasSessionHint(cookieString: string): boolean {
  return cookieString.split(';').some((pair) => pair.trim() === `${SESSION_HINT_COOKIE}=1`);
}

export function clearSessionHint(): void {
  document.cookie = `${SESSION_HINT_COOKIE}=; Path=${BASE_PATH}; Max-Age=0; SameSite=Lax`;
}

export type AccountNameResult =
  { status: 'ok'; name: string } | { status: 'anonymous' } | { status: 'error' };

/** Pide el nombre visible a `/api/cuenta/yo` (contracts/rutas.md). */
export async function fetchAccountName(): Promise<AccountNameResult> {
  try {
    const response = await fetch(`${BASE_PATH}/api/cuenta/yo`, {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (response.status === 401) return { status: 'anonymous' };
    if (!response.ok) return { status: 'error' };
    const body = (await response.json()) as { name?: unknown };
    return typeof body.name === 'string' ? { status: 'ok', name: body.name } : { status: 'error' };
  } catch {
    return { status: 'error' };
  }
}

/** Rutas de la cuenta por idioma. «Entrar» y «salir» son Route Handlers: se usan con enlaces normales. */
export function accountPaths(locale: AccountLocale) {
  const home = locale === 'en' ? `${BASE_PATH}/en` : BASE_PATH;
  return { signIn: `${home}/entrar`, signOut: `${home}/salir` };
}

/** Dirección de «Entrar» con la página actual como regreso. */
export function signInHref(locale: AccountLocale, currentPath: string | null): string {
  const { signIn } = accountPaths(locale);
  return currentPath ? `${signIn}?volver=${encodeURIComponent(currentPath)}` : signIn;
}

/**
 * «Entrar» para la página actual. `pathname` es la ruta sin `basePath` ni idioma (`/sitios`), igual
 * en el servidor y en el cliente, así que el enlace trae su regreso aun sin JavaScript.
 */
export function currentSignInHref(locale: AccountLocale, pathname: string): string {
  const localePrefix = locale === 'en' ? '/en' : '';
  return signInHref(locale, `${BASE_PATH}${localePrefix}${pathname === '/' ? '' : pathname}`);
}
