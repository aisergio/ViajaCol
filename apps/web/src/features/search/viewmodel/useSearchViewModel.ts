'use client';

import type { SearchIndex, SearchItem } from '@viajacol/content/search-types';
import { useLocale } from 'next-intl';
import { useDeferredValue, useMemo, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { isSearchable, rankSearchResults, type SearchGroup } from '../model/rank';
import { loadSearchIndex } from '../model/searchIndex';

export type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Dirección sin idioma de una sugerencia; el enrutador de next-intl agrega `/en` si hace falta. */
export function searchItemHref(item: SearchItem): `/${string}` {
  return `/${item.c}/${item.s}`;
}

export type SearchViewModel = {
  query: string;
  status: SearchStatus;
  groups: SearchGroup[];
  count: number;
  /** El texto cambió y las sugerencias aún corresponden al anterior (useDeferredValue). */
  isStale: boolean;
  /** El texto alcanza para sugerir (dos letras o más): si no, la vista muestra la ayuda. */
  searchable: boolean;
  setQuery: (value: string) => void;
  /** Descarga el índice si aún no está (al enfocar o al escribir). También sirve para reintentar. */
  load: () => void;
  open: (item: SearchItem) => void;
};

/**
 * ViewModel del buscador (US4). El texto es estado local; el índice es remoto y lo carga el modelo
 * la primera vez que se usa el buscador; las sugerencias son estado derivado.
 * `initialQuery` es lo que alcanzó a escribirse en el campo simple antes de cargar el combobox.
 */
export function useSearchViewModel(loader = loadSearchIndex, initialQuery = ''): SearchViewModel {
  const locale = useLocale();
  const router = useRouter();
  const [query, setQueryState] = useState(initialQuery);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const deferredQuery = useDeferredValue(query);

  const groups = useMemo(
    () => (index ? rankSearchResults(index.items, deferredQuery) : []),
    [index, deferredQuery],
  );

  const load = () => {
    if (status === 'loading' || status === 'ready') return;
    setStatus('loading');
    loader(locale).then(
      (data) => {
        setIndex(data);
        setStatus('ready');
      },
      () => setStatus('error'),
    );
  };

  return {
    query,
    status,
    groups,
    count: groups.reduce((total, group) => total + group.items.length, 0),
    isStale: query !== deferredQuery,
    searchable: isSearchable(query),
    setQuery: (value) => {
      setQueryState(value);
      if (value.trim()) load();
    },
    load,
    open: (item) => {
      setQueryState('');
      router.push(searchItemHref(item));
    },
  };
}
