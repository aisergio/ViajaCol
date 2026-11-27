'use client';

import { useTranslations } from 'next-intl';
import type { TripField, TripFieldError, TripView } from '@/domain/trip';
import { TripDetailsFields } from '@/features/trip-list/view/TripDetailsFields';

type Props = {
  trip: TripView;
  errors: Partial<Record<TripField, TripFieldError>>;
  pending: boolean;
  onSave: (formData: FormData) => void;
};

/** «Datos del viaje» (US1): nombre, fechas, viajeros y presupuesto. */
export function TripDetailsForm({ trip, errors, pending, onSave }: Props) {
  const t = useTranslations('trip.form');
  const values = {
    name: trip.name,
    startDate: trip.startDate,
    endDate: trip.endDate,
    travelers: String(trip.travelers),
    budget: String(trip.budget),
  };

  return (
    <section aria-labelledby="datos-viaje" className="rounded-lg border border-line p-5">
      <h2 id="datos-viaje" className="font-display text-xl font-bold">
        {t('editTitle')}
      </h2>
      <form
        className="mt-4 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(new FormData(event.currentTarget));
        }}
      >
        <TripDetailsFields idPrefix="datos-viaje" values={values} errors={errors} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {t('save')}
        </button>
      </form>
    </section>
  );
}
