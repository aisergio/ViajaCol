'use client';

import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import type { TripFormValues } from '@/app/[locale]/mi-viaje/actions';
import { type TripFormAction, useTripFormViewModel } from '../viewmodel/useTripFormViewModel';
import { TripDetailsFields } from './TripDetailsFields';

type Props = { action: TripFormAction; defaults: TripFormValues };

/** «Nuevo viaje» (US1). Con éxito, el servidor abre el viaje creado. */
export function CreateTripForm({ action, defaults }: Props) {
  const t = useTranslations('trip');
  const formRef = useRef<HTMLFormElement>(null);
  const vm = useTripFormViewModel(action, defaults, formRef);

  return (
    <form ref={formRef} action={vm.formAction} className="space-y-5">
      <TripDetailsFields idPrefix="nuevo-viaje" values={vm.values} errors={vm.errors} />
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={vm.pending}
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {vm.pending ? t('form.saving') : t('form.create')}
        </button>
        <p role="status" aria-live="polite" className="min-h-6 text-sm font-semibold">
          {vm.error ? t(`errors.${vm.error}`) : null}
        </p>
      </div>
    </form>
  );
}
