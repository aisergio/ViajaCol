import { describe, expect, it } from 'vitest';
import { GET, generateStaticParams } from './route';

const call = (locale: string) =>
  GET(new Request(`http://localhost/ViajaCol/api/search-index/${locale}`), {
    params: Promise.resolve({ locale }),
  });

describe('GET /api/search-index/{locale} (contrato search-index.md)', () => {
  it('se genera para los dos idiomas', () => {
    expect(generateStaticParams()).toEqual([{ locale: 'es' }, { locale: 'en' }]);
  });

  it('devuelve el índice del idioma', async () => {
    const response = await call('en');
    expect(response.status).toBe(200);
    const body = (await response.json()) as { v: number; locale: string; items: unknown[] };
    expect(body.v).toBe(1);
    expect(body.locale).toBe('en');
    expect(Array.isArray(body.items)).toBe(true);
  });

  it('responde 404 a un idioma desconocido', async () => {
    expect((await call('fr')).status).toBe(404);
  });
});
