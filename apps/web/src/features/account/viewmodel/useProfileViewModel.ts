'use client';

import { useActionState, useEffect } from 'react';
import type { NameFormState } from '@/app/[locale]/cuenta/actions';
import { useAccountStore } from '../model/accountStore';

export type NameAction = (previous: NameFormState, formData: FormData) => Promise<NameFormState>;

/**
 * ViewModel del formulario del nombre visible. El estado del formulario es local (`useActionState`);
 * al guardar, el nombre nuevo pasa al store compartido y el encabezado lo muestra.
 */
export function useProfileViewModel(initialName: string, action: NameAction) {
  const [state, formAction, pending] = useActionState(action, { status: 'idle' });
  const rename = useAccountStore((store) => store.rename);

  useEffect(() => {
    if (state.status === 'ok') rename(state.name);
  }, [state, rename]);

  return {
    formAction,
    pending,
    name: state.status === 'ok' ? state.name : initialName,
    saved: state.status === 'ok',
    error: state.status === 'error' ? state.error : null,
  };
}
