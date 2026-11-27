import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearSearchIndexCache, loadSearchIndex, searchIndexUrl } from './searchIndex';

const index = { v: 1, locale: 'es', items: [] };

afterEach(() => clearSearchIndexCache());

describe('loadSearchIndex (contrato search-index.md)', () => {
  it('pide el índice del idioma una sola vez por sesión', async () => {
    const fetcher = vi.fn(async () => Response.json(index));
    await expect(loadSearchIndex('es', fetcher)).resolves.toEqual(index);
    await loadSearchIndex('es', fetcher);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith('/ViajaCol/api/search-index/es');
  });

  it('cada idioma tiene su propio índice', async () => {
    const fetcher = vi.fn(async () => Response.json(index));
    await loadSearchIndex('es', fetcher);
    await loadSearchIndex('en', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(searchIndexUrl('en')).toBe('/ViajaCol/api/search-index/en');
  });

  it('si falla, permite reintentar', async () => {
    const fetcher = vi
      .fn<(url: string) => Promise<Response>>()
      .mockResolvedValueOnce(new Response('error', { status: 503 }))
      .mockResolvedValueOnce(Response.json(index));
    await expect(loadSearchIndex('es', fetcher)).rejects.toThrow('503');
    await expect(loadSearchIndex('es', fetcher)).resolves.toEqual(index);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
