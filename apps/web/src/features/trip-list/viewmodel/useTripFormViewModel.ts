'use client';

import { type RefObject, useActionState, useEffect } from 'react';
import type { TripFormState, TripFormValues } from '@/app/[locale]/mi-viaje/actions';

export type TripFormAction = (
  previous: TripFormState,
  formData: FormData,
) => Promise<TripFormState>;

const IDLE: TripFormState = { status: 'idle' };

/**
 * ViewModel del formulario «Nuevo viaje» (US1). El estado del formulario es local (`useActionState`)
 * y funciona sin JavaScript. Si el servidor rechaza los datos, el formulario conserva lo escrito,
 * muestra el error junto a cada campo y lleva el foco al primero.
 */
export function useTripFormViewModel(
  action: TripFormAction,
  defaults: TripFormValues,
  formRef: RefObject<HTMLFormElement | null>,
) {
  const [state, formAction, pending] = useActionState(action, IDLE);

  useEffect(() => {
    if (state.status === 'error' && state.fields) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [state, formRef]);

  return {
    formAction,
    pending,
    values: state.status === 'error' && state.values ? state.values : defaults,
    errors: state.status === 'error' ? (state.fields ?? {}) : {},
    error: state.status === 'error' ? state.error : null,
  };
}
