// Guardián del origen (CloudFront Functions, runtime cloudfront-js-2.0, evento viewer-request).
// Solo deja pasar las peticiones que traen el secreto que agrega el Worker de Cloudflare. El secreto
// vive en el KeyValueStore asociado: rotarlo no exige volver a publicar la función.
import cf from 'cloudfront';

const kvs = cf.kvs();
const HEADER = 'x-viajacol-origin';

async function matches(key, value) {
  try {
    return value === (await kvs.get(key));
  } catch (err) {
    return false; // la clave no existe (por ejemplo, secret_previous fuera de una rotación)
  }
}

async function handler(event) {
  const request = event.request;
  const header = request.headers[HEADER];
  const value = header ? header.value : '';

  const allowed = value !== '' && ((await matches('secret', value)) || (await matches('secret_previous', value)));

  if (!allowed) {
    return {
      statusCode: 403,
      statusDescription: 'Forbidden',
      headers: {
        'content-type': { value: 'text/plain; charset=utf-8' },
        'cache-control': { value: 'no-store' },
      },
      body: { encoding: 'text', data: 'Acceso directo no permitido.' },
    };
  }

  delete request.headers[HEADER];
  return request;
}
