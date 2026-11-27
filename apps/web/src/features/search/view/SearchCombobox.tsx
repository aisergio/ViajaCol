'use client';

import { Autocomplete } from '@base-ui/react/autocomplete';
import type { SearchItem } from '@viajacol/content/search-types';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { SearchGroup } from '../model/rank';
import { useSearchViewModel } from '../viewmodel/useSearchViewModel';

export type SearchComboboxProps = {
  /** Texto escrito en el campo simple (`SearchBox`) antes de que este componente llegara. */
  initialQuery?: string;
  /** Toma el foco al montarse, porque reemplaza al campo simple que lo tenía. */
  autoFocus?: boolean;
};

/**
 * Buscador del encabezado (View, US4). Usa el Autocomplete de Base UI (patrón combobox de ARIA): las
 * flechas recorren las sugerencias y Enter abre la elegida. El ViewModel filtra (`filter={null}`).
 * Llega en un fragmento aparte: lo carga `SearchBox` al primer uso.
 */
export function SearchCombobox({ initialQuery = '', autoFocus = false }: SearchComboboxProps) {
  const vm = useSearchViewModel(undefined, initialQuery);
  const t = useTranslations('search');
  const tNav = useTranslations('nav');
  const id = useId();
  const hasQuery = vm.searchable;

  const status =
    vm.status === 'loading'
      ? t('loading')
      : vm.status === 'error'
        ? t('error')
        : hasQuery && vm.status === 'ready' && vm.count > 0
          ? t('results', { count: vm.count })
          : '';

  return (
    <Autocomplete.Root
      items={vm.groups.map((group) => ({ value: group.category, items: group.items }))}
      filter={null}
      value={vm.query}
      onValueChange={(value, details) => {
        if (details.reason !== 'item-press') vm.setQuery(value);
      }}
      itemToStringValue={(item: SearchItem) => item.n}
      // `always`: también cuando llega con texto del campo simple, sin que se haya tecleado aquí.
      autoHighlight="always"
      openOnInputClick
      defaultOpen={autoFocus && initialQuery.trim().length > 0}
    >
      <label htmlFor={id} className="sr-only">
        {t('label')}
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
        />
        <Autocomplete.Input
          id={id}
          placeholder={t('placeholder')}
          autoFocus={autoFocus}
          onFocus={vm.load}
          className="h-11 w-full min-w-0 rounded-full border border-line bg-surface pr-3 pl-9 text-sm text-foreground placeholder:text-muted focus:border-primary"
        />
      </div>
      <Autocomplete.Portal>
        <Autocomplete.Positioner sideOffset={8} align="end" className="z-50 outline-none">
          <Autocomplete.Popup className="max-h-[min(30rem,var(--available-height))] w-[min(28rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-xl border border-line bg-background p-2 text-foreground shadow-xl">
            <Autocomplete.Status className="px-2 py-1 text-xs text-muted empty:hidden">
              {status}
            </Autocomplete.Status>
            {vm.status === 'error' ? (
              <button
                type="button"
                onClick={vm.load}
                className="mx-2 mb-2 inline-flex min-h-11 items-center rounded-md border border-line px-3 text-sm font-semibold"
              >
                {t('retry')}
              </button>
            ) : null}
            <Autocomplete.Empty className="px-2 py-3 text-sm text-muted empty:hidden">
              {vm.status === 'error'
                ? null
                : hasQuery && vm.status === 'ready' && !vm.isStale
                  ? t('noResults', { query: vm.query })
                  : t('hint')}
            </Autocomplete.Empty>
            <Autocomplete.List>
              {(group: { value: SearchGroup['category']; items: SearchItem[] }) => (
                <Autocomplete.Group key={group.value} items={group.items} className="py-1">
                  <Autocomplete.GroupLabel className="px-2 py-1 text-xs font-bold tracking-wide text-link uppercase">
                    {tNav(group.value)}
                  </Autocomplete.GroupLabel>
                  <Autocomplete.Collection>
                    {(item: SearchItem) => (
                      <Autocomplete.Item
                        key={`${item.c}/${item.s}`}
                        value={item}
                        onClick={() => vm.open(item)}
                        className="flex min-h-11 cursor-pointer flex-col justify-center rounded-md px-2 py-1.5 data-highlighted:bg-surface data-highlighted:outline-2 data-highlighted:outline-primary"
                      >
                        <span className="text-sm font-semibold">{item.n}</span>
                        {item.p || item.r ? (
                          <span className="text-xs text-muted">
                            {[item.p, item.r].filter(Boolean).join(' · ')}
                          </span>
                        ) : null}
                      </Autocomplete.Item>
                    )}
                  </Autocomplete.Collection>
                </Autocomplete.Group>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
