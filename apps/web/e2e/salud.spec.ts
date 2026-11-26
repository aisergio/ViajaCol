import { expect, test } from '@playwright/test';

test.describe('Endpoint de salud', () => {
  test('responde ok, sin caché y con la versión compilada', async ({ request }) => {
    const response = await request.get('api/health');

    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('no-store');
    expect(await response.json()).toMatchObject({ status: 'ok', version: expect.any(String) });
  });

  test('el POST conserva el cuerpo', async ({ request }) => {
    const response = await request.post('api/health', {
      data: 'viajacol',
      headers: { 'content-type': 'text/plain' },
    });

    expect(await response.json()).toEqual({ status: 'ok', received: 8 });
  });
});
