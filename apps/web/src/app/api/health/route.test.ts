import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET, POST } from './route';

describe('/api/health', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('responde ok con el commit publicado y sin caché', async () => {
    vi.stubEnv('APP_VERSION', 'abc1234');
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({ status: 'ok', version: 'abc1234' });
  });

  it('informa «dev» cuando no hay commit de compilación', async () => {
    vi.stubEnv('APP_VERSION', undefined);
    await expect(GET().json()).resolves.toEqual({ status: 'ok', version: 'dev' });
  });

  it('el POST devuelve el tamaño exacto del cuerpo recibido', async () => {
    const request = new Request('http://localhost/ViajaCol/api/health', {
      method: 'POST',
      body: 'viajacol',
    });
    const response = await POST(request);

    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({ status: 'ok', received: 8 });
  });
});
