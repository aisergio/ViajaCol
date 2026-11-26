// Pruebas del Worker con el runner nativo de Node (node --test): el Worker solo usa APIs web
// estándar (fetch, Request, Response, Headers, crypto.subtle), así que no hace falta wrangler.
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import worker, { MAX_BODY_BYTES, sha256Hex } from './worker.mjs';

const env = { BASE_PATH: '/ViajaCol', ORIGIN_HOST: 'd111111abcdef8.cloudfront.net', ORIGIN_SECRET: 's3cr3t' };
const realFetch = globalThis.fetch;
let calls;

beforeEach(() => {
  calls = [];
  globalThis.fetch = async (input, init = {}) => {
    calls.push({ input, init });
    return new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } });
  };
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

const run = (url, init) => worker.fetch(new Request(url, init), env);

describe('canonización de la ruta', () => {
  for (const variant of ['/viajacol', '/VIAJACOL/en', '/Viajacol/sitios?region=caribe']) {
    it(`redirige ${variant} a la forma canónica con 301`, async () => {
      const response = await run(`https://aisergio.dev${variant}`);
      assert.equal(response.status, 301);
      const location = new URL(response.headers.get('location'));
      assert.equal(location.pathname.slice(0, 9), '/ViajaCol');
      assert.equal(location.search, new URL(`https://x${variant}`).search);
      assert.equal(calls.length, 0);
    });
  }

  it('deja pasar al origen del dominio una ruta parecida que no es del sitio', async () => {
    const request = new Request('https://aisergio.dev/ViajaColombia');
    await worker.fetch(request, env);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].input, request);
  });
});

describe('reenvío a CloudFront', () => {
  it('agrega el secreto y el host público, y quita cabeceras que el cliente no debe fijar', async () => {
    await run('https://aisergio.dev/ViajaCol/en?x=1', {
      headers: { 'x-viajacol-origin': 'falso', 'x-forwarded-host': 'evil.example', 'x-amz-content-sha256': 'abc' },
    });
    assert.equal(calls.length, 1);
    const { input, init } = calls[0];
    assert.equal(String(input), 'https://d111111abcdef8.cloudfront.net/ViajaCol/en?x=1');
    assert.equal(init.headers.get('x-viajacol-origin'), 's3cr3t');
    assert.equal(init.headers.get('x-forwarded-host'), 'aisergio.dev');
    assert.equal(init.headers.get('x-forwarded-proto'), 'https');
    assert.equal(init.headers.get('x-amz-content-sha256'), null);
    assert.equal(init.redirect, 'manual');
  });

  it('acepta /ViajaCol sin barra final', async () => {
    await run('https://aisergio.dev/ViajaCol');
    assert.equal(String(calls[0].input), 'https://d111111abcdef8.cloudfront.net/ViajaCol');
  });

  it('calcula el hash del cuerpo en un POST', async () => {
    await run('https://aisergio.dev/ViajaCol/api/health', { method: 'POST', body: 'viajacol' });
    const { init } = calls[0];
    assert.equal(init.headers.get('x-amz-content-sha256'), await sha256Hex(new TextEncoder().encode('viajacol')));
    assert.equal(new TextDecoder().decode(init.body), 'viajacol');
  });

  it('rechaza con 413 un cuerpo de más de 1 MB sin llegar al origen', async () => {
    const response = await run('https://aisergio.dev/ViajaCol/api/health', {
      method: 'POST',
      body: new Uint8Array(MAX_BODY_BYTES + 1),
    });
    assert.equal(response.status, 413);
    assert.equal(calls.length, 0);
  });
});

describe('redirecciones del origen', () => {
  it('reescribe al dominio público un Location que apunta a un host interno', async () => {
    globalThis.fetch = async () =>
      new Response(null, { status: 307, headers: { location: 'https://abc123.lambda-url.us-east-2.on.aws/ViajaCol/en' } });
    const response = await run('https://aisergio.dev/ViajaCol/en/');
    assert.equal(response.headers.get('location'), 'https://aisergio.dev/ViajaCol/en');
  });

  it('respeta un Location relativo', async () => {
    globalThis.fetch = async () => new Response(null, { status: 308, headers: { location: '/ViajaCol' } });
    const response = await run('https://aisergio.dev/ViajaCol/');
    assert.equal(response.headers.get('location'), '/ViajaCol');
  });
});

it('sha256Hex coincide con el vector conocido de la cadena vacía', async () => {
  assert.equal(await sha256Hex(new ArrayBuffer(0)), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});
