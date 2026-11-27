'use client';

import { TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  type DeleteAction,
  useDeleteAccountViewModel,
} from '../viewmodel/useDeleteAccountViewModel';

type Props = { action: DeleteAction };

/** «Eliminar mi cuenta» con confirmación escrita (US5). Sin la palabra exacta, no se borra nada. */
export function DeleteAccountForm({ action }: Props) {
  const t = useTranslations('account.page');
  const vm = useDeleteAccountViewModel(action);

  if (!vm.confirming) {
    return (
      <button
        type="button"
        onClick={vm.start}
        className="inline-flex min-h-11 items-center rounded-md border border-line px-5 font-semibold hover:bg-surface"
      >
        {t('deleteOpen')}
      </button>
    );
  }

  return (
    <form action={vm.formAction} className="space-y-3">
      <label htmlFor="confirmar-eliminar" className="block font-semibold">
        {t('deleteConfirmLabel')}
      </label>
      <input
        id="confirmar-eliminar"
        name="confirmar"
        autoComplete="off"
        required
        aria-describedby="eliminar-estado"
        aria-invalid={vm.error === 'confirmacion' ? true : undefined}
        className="block min-h-11 w-full max-w-xs rounded-md border border-line bg-background px-3"
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={vm.pending}
          className="inline-flex min-h-11 items-center rounded-md bg-[var(--vc-flag-red)] px-5 font-semibold text-white disabled:opacity-60"
        >
          {vm.pending ? t('deleting') : t('deleteConfirm')}
        </button>
        <button
          type="button"
          onClick={vm.cancel}
          className="inline-flex min-h-11 items-center rounded-md border border-line px-5 font-semibold hover:bg-surface"
        >
          {t('deleteCancel')}
        </button>
      </div>
      <p id="eliminar-estado" role="status" aria-live="polite" className="min-h-6 text-sm">
        {vm.error ? (
          <span className="inline-flex items-center gap-2 font-semibold">
            <TriangleAlert aria-hidden="true" className="size-4 text-[var(--vc-flag-red)]" />
            {t(`deleteErrors.${vm.error}`)}
          </span>
        ) : null}
      </p>
    </form>
  );
}
