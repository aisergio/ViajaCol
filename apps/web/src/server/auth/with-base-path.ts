import { BASE_PATH } from './return-path';

/**
 * Next.js entrega a los Route Handlers la URL sin el `basePath` (`/api/auth/…` en lugar de
 * `/ViajaCol/api/auth/…`), y Better Auth enruta con la ruta completa (research D-02). Esta función
 * devuelve una petición equivalente con el prefijo restituido.
 */
export function withBasePath(request: Request, basePath = BASE_PATH): Request {
  const url = new URL(request.url);
  if (url.pathname === basePath || url.pathname.startsWith(`${basePath}/`)) return request;
  url.pathname = `${basePath}${url.pathname}`;
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers: request.headers,
    body: hasBody ? request.body : undefined,
    redirect: 'manual',
    signal: request.signal,
  };
  if (hasBody) init.duplex = 'half';
  return new Request(url, init);
}
