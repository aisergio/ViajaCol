'use client';

import { TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type NameAction, useProfileViewModel } from '../viewmodel/useProfileViewModel';

type Props = { initialName: string; action: NameAction };

/** Formulario del nombre visible (US4). El resultado se anuncia en una región viva. */
export function ProfileForm({ initialName, action }: Props) {
  const t = useTranslations('account.page');
  const vm = useProfileViewModel(initialName, action);

  return (
    <form action={vm.formAction} className="space-y-3">
      <div>
        <label htmlFor="nombre-visible" className="block font-semibold">
          {t('displayName')}
        </label>
        <p id="nombre-ayuda" className="mt-1 text-sm text-muted">
          {t('displayNameHint')}
        </p>
        <input
          id="nombre-visible"
          name="nombre"
          defaultValue={vm.name}
          required
          maxLength={50}
          autoComplete="nickname"
          aria-describedby="nombre-ayuda nombre-estado"
          aria-invalid={vm.error === 'nombre-invalido' ? true : undefined}
          className="mt-2 block min-h-11 w-full max-w-md rounded-md border border-line bg-background px-3"
        />
      </div>
      <button
        type="submit"
        disabled={vm.pending}
        className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60"
      >
        {vm.pending ? t('saving') : t('save')}
      </button>
      <p id="nombre-estado" role="status" aria-live="polite" className="min-h-6 text-sm">
        {vm.error ? (
          <span className="inline-flex items-center gap-2 font-semibold">
            <TriangleAlert aria-hidden="true" className="size-4 text-[var(--vc-flag-red)]" />
            {t(`errors.${vm.error}`)}
          </span>
        ) : vm.saved ? (
          t('saved')
        ) : null}
      </p>
    </form>
  );
}
