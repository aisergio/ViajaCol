import { describe, expect, it } from 'vitest';
import { withBasePath } from './with-base-path';

describe('withBasePath', () => {
  it('antepone /ViajaCol a la ruta que entrega Next.js', () => {
    const request = withBasePath(new Request('http://localhost:3000/api/auth/ok?x=1'));
    expect(new URL(request.url).pathname).toBe('/ViajaCol/api/auth/ok');
    expect(new URL(request.url).search).toBe('?x=1');
  });

  it('no duplica el prefijo si ya está', () => {
    const original = new Request('http://localhost:3000/ViajaCol/api/auth/ok');
    expect(withBasePath(original)).toBe(original);
  });

  it('conserva el método, las cabeceras y el cuerpo', async () => {
    const request = withBasePath(
      new Request('http://localhost:3000/api/auth/sign-out', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: 'a=b' },
        body: JSON.stringify({ hola: 'mundo' }),
      }),
    );
    expect(request.method).toBe('POST');
    expect(request.headers.get('cookie')).toBe('a=b');
    expect(await request.json()).toEqual({ hola: 'mundo' });
  });
});
