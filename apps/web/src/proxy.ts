import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * Proxy (antes middleware) de Next.js 16: resuelve el idioma desde la ruta.
 * Español sin prefijo y `/en` para inglés; el prefijo `/es` redundante se redirige.
 */
export default createMiddleware(routing);

export const config = {
  // Con basePath la raíz (`/ViajaCol`) debe declararse aparte; el resto: todas las rutas excepto la
  // API, los recursos internos de Next y los archivos con extensión.
  matcher: ['/', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
