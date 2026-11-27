import type { SearchIndex } from '@viajacol/content/search-types';

/**
 * Servicio de cliente del índice de búsqueda (Model). Descarga el índice estático una sola vez por
 * idioma y sesión, y lo guarda en memoria. Si falla, olvida la promesa para permitir reintentar.
 */
type Fetcher = (url: string) => Promise<Response>;

const cache = new Map<string, Promise<SearchIndex>>();

export function searchIndexUrl(locale: string): string {
  return `/ViajaCol/api/search-index/${locale}`;
}

export function loadSearchIndex(
  locale: string,
  fetcher: Fetcher = (url) => fetch(url),
): Promise<SearchIndex> {
  const cached = cache.get(locale);
  if (cached) return cached;
  const promise = fetcher(searchIndexUrl(locale)).then(async (response) => {
    if (!response.ok) throw new Error(`Índice de búsqueda: HTTP ${response.status}`);
    return (await response.json()) as SearchIndex;
  });
  cache.set(locale, promise);
  promise.catch(() => cache.delete(locale));
  return promise;
}

/** Solo para pruebas. */
export function clearSearchIndexCache(): void {
  cache.clear();
}
