'use client';

import { useCallback, useState } from 'react';
import { hasSessionHint } from '@/features/account/model/session';
import {
  type DraftAddResult,
  type DraftKind,
  useDraftStore,
} from '@/features/trip-draft/model/draftStore';

export type AddToTripState =
  { phase: 'idle' } | { phase: 'draft'; result: DraftAddResult } | { phase: 'dialog' };

/**
 * ViewModel del botón «Agregar a Mi viaje» (US2, US5). Con indicador de sesión abre el diálogo de
 * viajes; sin él, agrega al borrador local y lo anuncia.
 */
export function useAddToTripViewModel(entry: { kind: DraftKind; slug: string; name: string }) {
  const [state, setState] = useState<AddToTripState>({ phase: 'idle' });
  const { kind, slug, name } = entry;

  const start = useCallback(() => {
    if (hasSessionHint(document.cookie)) {
      setState({ phase: 'dialog' });
      return;
    }
    setState({ phase: 'draft', result: useDraftStore.getState().add({ kind, slug, title: name }) });
  }, [kind, slug, name]);

  const close = useCallback(() => setState({ phase: 'idle' }), []);
  return { state, start, close };
}
