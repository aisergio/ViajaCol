// Borde de ViajaCol: Cloudflare Worker en las rutas aisergio.dev/ViajaCol* (y sus variantes de
// mayúsculas). El resto del dominio no pasa por aquí.
//
// - Canoniza /viajacol, /VIAJACOL... a /ViajaCol con 301.
// - Reenvía a CloudFront con el secreto del origen y el host público (X-Forwarded-Host), que Next.js
//   usa para verificar el origen de las acciones del servidor.
// - En las peticiones con cuerpo calcula x-amz-content-sha256: CloudFront firma con OAC hacia la
//   Function URL y Lambda no acepta cuerpos sin hash. Limita el cuerpo a 1 MB.
// - Devuelve la respuesta sin acumularla, así que el streaming llega tal cual.
// - Las respuestas que genera él mismo (la redirección canónica y el 413) no pasan por CloudFront,
//   así que llevan aquí las seis cabeceras de seguridad de FR-006.

export const MAX_BODY_BYTES = 1024 * 1024;

// Los mismos valores que la política de respuesta de CloudFront (infra/live/cdn.tf). La CSP es la más
// estricta posible porque estas respuestas no cargan nada.
export const SECURITY_HEADERS = Object.freeze({
  'strict-transport-security': 'max-age=63072000',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
});

const INTERNAL_HOST = /(\.cloudfront\.net|\.lambda-url\.[a-z0-9-]+\.on\.aws)$/i;
const DROP_REQUEST_HEADERS = ['host', 'x-amz-content-sha256', 'x-forwarded-host', 'x-forwarded-proto', 'x-viajacol-origin'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const base = env.BASE_PATH;
    const path = url.pathname;

    if (!isUnder(path, base)) {
      if (isUnder(path.toLowerCase(), base.toLowerCase())) {
        url.pathname = base + path.slice(base.length);
        return new Response(null, { status: 301, headers: { location: url.toString(), ...SECURITY_HEADERS } });
      }
      // Una ruta parecida (por ejemplo, /ViajaColombia) no es del sitio: sigue al origen del dominio.
      return fetch(request);
    }

    const headers = new Headers(request.headers);
    for (const name of DROP_REQUEST_HEADERS) headers.delete(name);
    headers.set('x-forwarded-host', url.host);
    headers.set('x-forwarded-proto', 'https');
    headers.set('x-viajacol-origin', env.ORIGIN_SECRET);

    let body;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      if (Number(request.headers.get('content-length') ?? '0') > MAX_BODY_BYTES) return payloadTooLarge();
      body = await request.arrayBuffer();
      if (body.byteLength > MAX_BODY_BYTES) return payloadTooLarge();
      headers.set('x-amz-content-sha256', await sha256Hex(body));
    }

    const origin = new URL(`${path}${url.search}`, `https://${env.ORIGIN_HOST}`);
    const response = await fetch(origin, { method: request.method, headers, body, redirect: 'manual' });
    return withPublicLocation(response, url);
  },
};

function isUnder(path, base) {
  return path === base || path.startsWith(`${base}/`);
}

function payloadTooLarge() {
  return new Response('El cuerpo supera 1 MB.', {
    status: 413,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...SECURITY_HEADERS },
  });
}

export async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Una redirección absoluta hacia un host interno (CloudFront o la Function URL) se reescribe al
// dominio público, para no exponer el origen.
function withPublicLocation(response, publicUrl) {
  const location = response.headers.get('location');
  if (!location) return response;

  let target;
  try {
    target = new URL(location, publicUrl);
  } catch {
    return response;
  }
  if (!INTERNAL_HOST.test(target.hostname)) return response;

  target.protocol = 'https:';
  target.host = publicUrl.host;
  const rewritten = new Response(response.body, response);
  rewritten.headers.set('location', target.toString());
  return rewritten;
}
