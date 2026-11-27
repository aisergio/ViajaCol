import { afterEach, describe, expect, it, vi } from 'vitest';
import { accountPaths, fetchAccountName, hasSessionHint, signInHref } from './session';

describe('modelo de la cuenta en el cliente', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('detecta solo el indicador con valor 1', () => {
    expect(hasSessionHint('tema=oscuro; viajacol.con_sesion=1')).toBe(true);
    expect(hasSessionHint('viajacol.con_sesion=')).toBe(false);
    expect(hasSessionHint('')).toBe(false);
  });

  it('arma las rutas por idioma y el regreso a la página actual', () => {
    expect(accountPaths('es')).toEqual({ signIn: '/ViajaCol/entrar', signOut: '/ViajaCol/salir' });
    expect(accountPaths('en').signOut).toBe('/ViajaCol/en/salir');
    expect(signInHref('es', '/ViajaCol/sitios?region=caribe')).toBe('/ViajaCol/entrar?volver=%2FViajaCol%2Fsitios%3Fregion%3Dcaribe');
    expect(signInHref('en', null)).toBe('/ViajaCol/en/entrar');
  });

  it.each([
    [{ status: 200, body: { name: 'Ana' } }, { status: 'ok', name: 'Ana' }],
    [{ status: 401, body: { error: 'sin-sesion' } }, { status: 'anonymous' }],
    [{ status: 503, body: {} }, { status: 'error' }],
    [{ status: 200, body: { name: 42 } }, { status: 'error' }],
  ])('interpreta la respuesta %j', async ({ status, body }, expected) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchAccountName()).resolves.toEqual(expected);
    expect(fetchMock).toHaveBeenCalledWith('/ViajaCol/api/cuenta/yo', { credentials: 'same-origin', cache: 'no-store' });
  });

  it('sin red responde error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(fetchAccountName()).resolves.toEqual({ status: 'error' });
  });
});
