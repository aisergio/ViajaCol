'use client';

import type { CardItem } from '@viajacol/content';
import { REGION_SLUGS, type RegionSlug } from '@viajacol/content/constants';
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
import {
  filterCards,
  hasActiveFilters,
  MAX_QUERY_LENGTH,
  sanitizeFilters,
  type CatalogFilters,
} from '../model/filters';

/**
 * Los filtros viven en la URL (estado global por URL): `?region=&mes=&q=`. Región y mes agregan una
 * entrada al historial, así que «atrás» deshace el último filtro; el texto la reemplaza para no
 * llenar el historial con cada letra. La navegación es superficial: no va al servidor.
 */
const parsers = {
  region: parseAsStringLiteral(REGION_SLUGS),
  mes: parseAsInteger,
  q: parseAsString.withDefault('').withOptions({ history: 'replace' }),
};

export type CatalogFiltersViewModel = {
  filters: CatalogFilters;
  results: CardItem[];
  total: number;
  hasFilters: boolean;
  setRegion: (region: RegionSlug | null) => void;
  setMonth: (month: number | null) => void;
  setQuery: (query: string) => void;
  clear: () => void;
};

export function useCatalogFiltersViewModel(cards: readonly CardItem[]): CatalogFiltersViewModel {
  const [params, setParams] = useQueryStates(parsers, { history: 'push' });
  const filters = sanitizeFilters({ region: params.region, month: params.mes, query: params.q });
  // Estado derivado: el React Compiler lo memoriza; no hace falta useMemo.
  const results = filterCards(cards, filters);

  return {
    filters,
    results,
    total: cards.length,
    hasFilters: hasActiveFilters(filters),
    setRegion: (next) => void setParams({ region: next }),
    setMonth: (next) => void setParams({ mes: next }),
    setQuery: (next) => void setParams({ q: next.slice(0, MAX_QUERY_LENGTH) || null }),
    clear: () => void setParams({ region: null, mes: null, q: null }),
  };
}
