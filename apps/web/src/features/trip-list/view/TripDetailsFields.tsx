'use client';

import { TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { TripFormValues } from '@/app/[locale]/mi-viaje/actions';
import { TRIP_LIMITS, type TripField, type TripFieldError } from '@/domain/trip';

type Props = {
  idPrefix: string;
  values: TripFormValues;
  errors: Partial<Record<TripField, TripFieldError>>;
};

const INPUT =
  'mt-1 block min-h-11 w-full rounded-md border border-line bg-background px-3 aria-[invalid=true]:border-2 aria-[invalid=true]:border-[var(--vc-flag-red)]';

/**
 * Campos del viaje (US1), compartidos por «Nuevo viaje» y «Datos del viaje». Cada error va junto a su
 * campo, enlazado con `aria-describedby`, y no depende solo del color (icono y texto).
 */
export function TripDetailsFields({ idPrefix, values, errors }: Props) {
  const t = useTranslations('trip.form');

  const field = (name: TripField, hint = false) => {
    const describedBy = [
      hint ? `${idPrefix}-${name}-ayuda` : null,
      errors[name] ? `${idPrefix}-${name}-error` : null,
    ]
      .filter(Boolean)
      .join(' ');
    return {
      id: `${idPrefix}-${name}`,
      name,
      defaultValue: values[name],
      'aria-invalid': errors[name] ? true : undefined,
      'aria-describedby': describedBy || undefined,
      className: INPUT,
    } as const;
  };

  const message = (name: TripField) => {
    const code = errors[name];
    if (!code) return null;
    return (
      <p
        id={`${idPrefix}-${name}-error`}
        className="mt-1 flex items-start gap-1.5 text-sm font-semibold"
      >
        <TriangleAlert
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--vc-flag-red)]"
        />
        {t(`fieldErrors.${code}`)}
      </p>
    );
  };

  const hint = (name: TripField, text: string) => (
    <p id={`${idPrefix}-${name}-ayuda`} className="mt-1 text-sm text-muted">
      {text}
    </p>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-name`} className="font-semibold">
          {t('name')}
        </label>
        <input
          type="text"
          required
          maxLength={TRIP_LIMITS.name}
          autoComplete="off"
          {...field('name')}
        />
        {message('name')}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-startDate`} className="font-semibold">
          {t('startDate')}
        </label>
        <input type="date" required {...field('startDate')} />
        {message('startDate')}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-endDate`} className="font-semibold">
          {t('endDate')}
        </label>
        <input type="date" required {...field('endDate', true)} />
        {hint('endDate', t('datesHint'))}
        {message('endDate')}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-travelers`} className="font-semibold">
          {t('travelers')}
        </label>
        <input
          type="number"
          required
          min={1}
          max={TRIP_LIMITS.travelers}
          step={1}
          inputMode="numeric"
          {...field('travelers', true)}
        />
        {hint('travelers', t('travelersHint'))}
        {message('travelers')}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-budget`} className="font-semibold">
          {t('budget')}
        </label>
        <input
          type="number"
          required
          min={0}
          max={TRIP_LIMITS.money}
          step={1}
          inputMode="numeric"
          {...field('budget', true)}
        />
        {hint('budget', t('budgetHint'))}
        {message('budget')}
      </div>
    </div>
  );
}
