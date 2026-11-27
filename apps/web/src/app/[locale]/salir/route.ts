import { resolveLocale } from '@/i18n/locale';
import { getAuth, getAuthConfig } from '@/server/auth/auth';
import { clearSessionCookies } from '@/server/auth/cookies';
import { homeFor } from '@/server/auth/return-path';

type Context = { params: Promise<{ locale: string }> };

const NO_STORE = 'private, no-store';

/** Solo se acepta un formulario del propio sitio: nadie puede cerrar la sesión desde otro sitio. */
function isSameOrigin(request: Request, origin: string): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return false;
  return request.headers.get('origin') === origin;
}

/**
 * «Cerrar sesión» (contracts/rutas.md): borra la sesión del sitio y pasa por el cierre de sesión de
 * Cognito, que vuelve a la portada del idioma (FR-007).
 */
export async function POST(request: Request, { params }: Context) {
  const locale = resolveLocale((await params).locale);
  const config = await getAuthConfig().catch(() => null);
  if (!config) return new Response('Servicio no disponible.', { status: 503, headers: { 'cache-control': NO_STORE } });
  if (!isSameOrigin(request, config.origin)) {
    return new Response('Origen no permitido.', { status: 403, headers: { 'cache-control': NO_STORE } });
  }

  const auth = await getAuth();
  const signOut = await auth.api.signOut({ headers: request.headers, asResponse: true }).catch(() => null);

  const logout = new URL(`https://${config.cognito.domain}/logout`);
  logout.searchParams.set('client_id', config.cognito.clientId);
  logout.searchParams.set('logout_uri', `${config.origin}${homeFor(locale)}`);

  const response = new Response(null, { status: 303, headers: { location: logout.toString(), 'cache-control': NO_STORE } });
  for (const cookie of signOut?.headers.getSetCookie() ?? []) response.headers.append('set-cookie', cookie);
  for (const cookie of clearSessionCookies(config.origin.startsWith('https://'))) response.headers.append('set-cookie', cookie);
  return response;
}
