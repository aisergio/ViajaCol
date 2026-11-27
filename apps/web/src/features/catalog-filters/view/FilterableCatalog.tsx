'use client';

import type { CardItem } from '@viajacol/content';
import { useTranslations } from 'next-intl';
import { Suspense, useLayoutEffect, useState, type ReactNode } from 'react';
import { CatalogGrid } from '@/components/catalog/CatalogGrid';
import { EMPTY_FILTERS } from '../model/filters';
import { useCatalogFiltersViewModel } from '../viewmodel/useCatalogFiltersViewModel';
import { FilterBar, type RegionOption } from './FilterBar';

type Props = { cards: CardItem[]; regions: RegionOption[]; withMonth: boolean };

/**
 * Lista filtrable (View). La rejilla se dibuja en el servidor con todas las fichas y se hidrata tal
 * cual: no se vuelve a crear en el cliente (D-06, D-11). Solo los controles leen la URL con nuqs, y en
 * una página estática eso hace que su subárbol se dibuje en el cliente, así que van en su propio
 * `<Suspense>`. Los controles avisan qué fichas quedan, y React conserva las tarjetas visibles.
 */
export function FilterableCatalog({ cards, regions, withMonth }: Props) {
  const t = useTranslations('catalog.filters');
  /** Slugs visibles separados por comas, o `null` mientras no haya filtros. */
  const [visible, setVisible] = useState<string | null>(null);
  const slugs = visible === null ? null : new Set(visible.split(','));
  const shown = slugs ? cards.filter((card) => slugs.has(card.slug)) : cards;

  return (
    <section aria-label={t('label')} className="mx-auto max-w-6xl px-4">
      <Suspense
        fallback={<StaticControls total={cards.length} regions={regions} withMonth={withMonth} />}
      >
        <UrlControls
          cards={cards}
          regions={regions}
          withMonth={withMonth}
          onVisibleChange={setVisible}
        />
      </Suspense>
      {shown.length > 0 ? (
        <div className="mt-2">
          <CatalogGrid cards={shown} priorityFirst={1} />
        </div>
      ) : null}
    </section>
  );
}

/** Controles enlazados a la URL: barra de filtros, conteo, «Quitar filtros» y estado vacío. */
function UrlControls({
  cards,
  regions,
  withMonth,
  onVisibleChange,
}: Props & { onVisibleChange: (visible: string | null) => void }) {
  const vm = useCatalogFiltersViewModel(cards);
  const t = useTranslations('catalog.filters');
  const visible = vm.hasFilters ? vm.results.map((card) => card.slug).join(',') : null;

  // La URL es un sistema externo: cuando cambia, la rejilla se sincroniza con ella antes de pintar,
  // para que el estado vacío y la rejilla anterior no se vean juntos.
  useLayoutEffect(() => onVisibleChange(visible), [visible, onVisibleChange]);

  return (
    <>
      <FilterBar
        regions={regions}
        withMonth={withMonth}
        filters={vm.filters}
        onRegion={vm.setRegion}
        onMonth={vm.setMonth}
        onQuery={vm.setQuery}
      />
      <StatusRow
        status={t('results', { count: vm.results.length, total: vm.total })}
        action={
          vm.hasFilters ? (
            <button
              type="button"
              onClick={vm.clear}
              className="min-h-11 rounded-md px-3 text-sm font-semibold text-link underline underline-offset-4"
            >
              {t('clear')}
            </button>
          ) : null
        }
      />
      {vm.results.length === 0 ? (
        <div className="mt-2 rounded-xl border border-dashed border-line p-10 text-center">
          <p className="text-lg font-semibold">{t('empty')}</p>
          <button
            type="button"
            onClick={vm.clear}
            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {t('clear')}
          </button>
        </div>
      ) : null}
    </>
  );
}

/**
 * Respaldo del servidor mientras hidrata (y sin JavaScript): los controles deshabilitados, con la
 * misma altura que los interactivos para no mover el contenido.
 */
function StaticControls({
  total,
  regions,
  withMonth,
}: {
  total: number;
  regions: RegionOption[];
  withMonth: boolean;
}) {
  const t = useTranslations('catalog.filters');
  return (
    <>
      <FilterBar regions={regions} withMonth={withMonth} filters={EMPTY_FILTERS} disabled />
      <StatusRow status={t('results', { count: total, total })} action={null} />
    </>
  );
}

function StatusRow({ status, action }: { status: string; action: ReactNode }) {
  return (
    <div className="mt-6 flex min-h-11 items-center justify-between gap-4">
      <p role="status" className="text-sm text-muted">
        {status}
      </p>
      {action}
    </div>
  );
}
