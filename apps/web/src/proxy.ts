import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { hasSessionCookie } from './server/auth/cookies';

const intlMiddleware = createMiddleware(routing);

/**
 * Páginas privadas: «Mi cuenta» (spec 006) y cada viaje con su calendario (spec 007). La lista
 * `/mi-viaje` es pública: sin sesión muestra el borrador. La verificación real ocurre en el servidor;
 * esto solo ahorra un viaje.
 */
const PRIVATE_PAGE = /^\/(en\/)?(cuenta|mi-viaje\/[^/]+(\/calendario)?)\/?$/;

/**
 * Proxy (antes middleware) de Next.js 16:
 * - resuelve el idioma desde la ruta: español sin prefijo y `/en` para inglés; el prefijo `/es`
 *   redundante se redirige;
 * - sin cookie de sesión, una página privada va directo a «Entrar» con la dirección de regreso.
 */
export default function proxy(request: NextRequest) {
  const { pathname, basePath } = request.nextUrl;
  if (PRIVATE_PAGE.test(pathname) && !hasSessionCookie(request.headers.get('cookie'))) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith('/en/') ? '/en/entrar' : '/entrar';
    url.search = `?volver=${encodeURIComponent(`${basePath}${pathname}`)}`;
    return NextResponse.redirect(url, 307);
  }
  return intlMiddleware(request);
}

export const config = {
  // Con basePath la raíz (`/ViajaCol`) debe declararse aparte; el resto: todas las rutas excepto la
  // API, los recursos internos de Next y los archivos con extensión.
  matcher: ['/', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
