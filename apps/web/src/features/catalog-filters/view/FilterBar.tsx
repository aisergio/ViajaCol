'use client';

import type { RegionSlug } from '@viajacol/content/constants';
import { cn } from '@viajacol/ui';
import { useLocale, useTranslations } from 'next-intl';
import { monthName } from '@/lib/dates';
import { MAX_QUERY_LENGTH, type CatalogFilters } from '../model/filters';

export type RegionOption = { slug: RegionSlug; name: string };

type Props = {
  regions: readonly RegionOption[];
  withMonth: boolean;
  filters: CatalogFilters;
  /** Sin JavaScript (respaldo del servidor) los controles se muestran deshabilitados. */
  disabled?: boolean;
  onRegion?: (region: RegionSlug | null) => void;
  onMonth?: (month: number | null) => void;
  onQuery?: (query: string) => void;
};

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

/** Barra de filtros (View): solo muestra el estado y avisa los cambios al ViewModel. */
export function FilterBar({
  regions,
  withMonth,
  filters,
  disabled = false,
  onRegion,
  onMonth,
  onQuery,
}: Props) {
  const t = useTranslations('catalog.filters');
  const locale = useLocale();
  const chip = (pressed: boolean) =>
    cn(
      'inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed',
      pressed
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-line bg-background text-foreground hover:border-primary',
    );
  const field =
    'h-11 w-full rounded-md border border-line bg-background px-3 text-sm disabled:cursor-not-allowed';

  return (
    <div className="space-y-4 rounded-xl border border-line bg-surface p-4">
      <fieldset>
        <legend className="text-sm font-semibold">{t('region')}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={filters.region === null}
            disabled={disabled}
            onClick={() => onRegion?.(null)}
            className={chip(filters.region === null)}
          >
            {t('allRegions')}
          </button>
          {regions.map((region) => (
            <button
              key={region.slug}
              type="button"
              aria-pressed={filters.region === region.slug}
              disabled={disabled}
              onClick={() => onRegion?.(region.slug)}
              className={chip(filters.region === region.slug)}
            >
              {region.name}
            </button>
          ))}
        </div>
      </fieldset>
      <div className={cn('grid gap-4', withMonth && 'sm:grid-cols-[minmax(0,14rem)_1fr]')}>
        {withMonth ? (
          <label className="block text-sm font-semibold">
            {t('month')}
            <select
              value={filters.month ?? ''}
              disabled={disabled}
              onChange={(event) =>
                onMonth?.(event.target.value ? Number(event.target.value) : null)
              }
              className={cn(field, 'mt-1')}
            >
              <option value="">{t('allMonths')}</option>
              {MONTHS.map((month) => (
                <option key={month} value={month}>
                  {monthName(month, locale)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="block text-sm font-semibold">
          {t('query')}
          <input
            type="search"
            value={filters.query}
            disabled={disabled}
            maxLength={MAX_QUERY_LENGTH}
            placeholder={t('queryPlaceholder')}
            onChange={(event) => onQuery?.(event.target.value)}
            className={cn(field, 'mt-1')}
          />
        </label>
      </div>
    </div>
  );
}
