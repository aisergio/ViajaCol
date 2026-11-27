'use client';

import { TriangleAlert } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type BudgetTotals, ITEM_KINDS } from '@/domain/trip';
import { formatCop } from '@/lib/dates';

type Props = { totals: BudgetTotals; budget: number };

/**
 * Presupuesto por categoría (US4). Los totales son estado derivado: se calculan del viaje en cada
 * render y nunca se guardan (FR-007). Pasarse del presupuesto se dice con texto e icono, no solo con
 * color (escenario 2).
 */
export function BudgetSummary({ totals, budget }: Props) {
  const t = useTranslations('trip.budget');
  const locale = useLocale();
  const money = (value: number) => formatCop(value, locale);
  const used =
    budget > 0
      ? Math.min(100, Math.round((totals.total / budget) * 100))
      : totals.total > 0
        ? 100
        : 0;

  return (
    <section aria-labelledby="presupuesto" className="rounded-lg border border-line p-5">
      <h2 id="presupuesto" className="font-display text-xl font-bold">
        {t('title')}
      </h2>
      <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        {ITEM_KINDS.map((kind) => (
          <div key={kind} className="contents">
            <dt>{t(`kinds.${kind}`)}</dt>
            <dd className="text-right tabular-nums">{money(totals.byKind[kind])}</dd>
          </div>
        ))}
        <dt className="mt-2 border-t border-line pt-2 font-semibold">{t('total')}</dt>
        <dd className="mt-2 border-t border-line pt-2 text-right font-semibold tabular-nums">
          {money(totals.total)}
        </dd>
        <dt>{t('budget')}</dt>
        <dd className="text-right tabular-nums">{money(budget)}</dd>
        <dt className="font-semibold">{t('remaining')}</dt>
        <dd className="text-right font-semibold tabular-nums">{money(totals.remaining)}</dd>
      </dl>
      <div aria-hidden="true" className="mt-3 h-2 overflow-hidden rounded-full bg-line">
        <div
          className={
            totals.over ? 'h-full bg-[var(--vc-flag-red)]' : 'h-full bg-[var(--vc-flag-blue)]'
          }
          style={{ width: `${used}%` }}
        />
      </div>
      {totals.over ? (
        <p className="mt-3 flex items-start gap-2 font-semibold">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-[var(--vc-flag-red)]"
          />
          {t('over', { amount: money(totals.total - budget) })}
        </p>
      ) : null}
    </section>
  );
}
