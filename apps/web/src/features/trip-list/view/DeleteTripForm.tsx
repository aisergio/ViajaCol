'use client';

import { TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type DeleteTripAction, useDeleteTripViewModel } from '../viewmodel/useDeleteTripViewModel';

type Props = { action: DeleteTripAction; name: string };

/** «Eliminar el viaje» con confirmación escrita (US1, escenario 4). Sin la palabra exacta, no se borra. */
export function DeleteTripForm({ action, name }: Props) {
  const t = useTranslations('trip');
  const vm = useDeleteTripViewModel(action);

  if (!vm.confirming) {
    return (
      <button
        type="button"
        onClick={vm.start}
        className="inline-flex min-h-11 items-center rounded-md border border-line px-5 font-semibold hover:bg-surface"
      >
        {t('remove.button')}
      </button>
    );
  }

  return (
    <form action={vm.formAction} className="space-y-3">
      <label htmlFor="confirmar-eliminar-viaje" className="block font-semibold">
        {t('remove.confirm', { name })}
      </label>
      <input
        id="confirmar-eliminar-viaje"
        name="confirmar"
        autoComplete="off"
        required
        aria-describedby="eliminar-viaje-estado"
        aria-invalid={vm.error === 'invalido' ? true : undefined}
        className="block min-h-11 w-full max-w-xs rounded-md border border-line bg-background px-3"
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={vm.pending}
          className="inline-flex min-h-11 items-center rounded-md bg-[var(--vc-flag-red)] px-5 font-semibold text-white disabled:opacity-60"
        >
          {vm.pending ? t('remove.deleting') : t('remove.yes')}
        </button>
        <button
          type="button"
          onClick={vm.cancel}
          className="inline-flex min-h-11 items-center rounded-md border border-line px-5 font-semibold hover:bg-surface"
        >
          {t('remove.no')}
        </button>
      </div>
      <p id="eliminar-viaje-estado" role="status" aria-live="polite" className="min-h-6 text-sm">
        {vm.error ? (
          <span className="inline-flex items-center gap-2 font-semibold">
            <TriangleAlert aria-hidden="true" className="size-4 text-[var(--vc-flag-red)]" />
            {vm.error === 'invalido' ? t('remove.mismatch') : t(`errors.${vm.error}`)}
          </span>
        ) : null}
      </p>
    </form>
  );
}
