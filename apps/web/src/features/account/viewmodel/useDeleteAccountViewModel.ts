'use client';

import { useActionState, useCallback, useState } from 'react';
import type { DeleteFormState } from '@/app/[locale]/cuenta/actions';

export type DeleteAction = (
  previous: DeleteFormState,
  formData: FormData,
) => Promise<DeleteFormState>;

/**
 * ViewModel de «Eliminar mi cuenta»: primero muestra la confirmación escrita y luego envía la acción.
 * Si sale bien, el servidor redirige; aquí solo se manejan los errores.
 */
export function useDeleteAccountViewModel(action: DeleteAction) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(action, { status: 'idle' });
  const start = useCallback(() => setConfirming(true), []);
  const cancel = useCallback(() => setConfirming(false), []);

  return {
    confirming,
    start,
    cancel,
    formAction,
    pending,
    error: state.status === 'error' ? state.error : null,
  };
}
