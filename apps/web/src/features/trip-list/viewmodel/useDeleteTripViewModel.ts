'use client';

import { useActionState, useState } from 'react';
import type { TripFormState } from '@/app/[locale]/mi-viaje/actions';

export type DeleteTripAction = (
  previous: TripFormState,
  formData: FormData,
) => Promise<TripFormState>;

const IDLE: TripFormState = { status: 'idle' };

/**
 * ViewModel de «Eliminar el viaje» (US1, escenario 4): primero pide la confirmación escrita y luego
 * envía la acción. Si sale bien, el servidor redirige a la lista; aquí solo se manejan los errores.
 */
export function useDeleteTripViewModel(action: DeleteTripAction) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(action, IDLE);
  return {
    confirming,
    start: () => setConfirming(true),
    cancel: () => setConfirming(false),
    formAction,
    pending,
    error: state.status === 'error' ? state.error : null,
  };
}
