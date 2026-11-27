'use client';

import { useEffect, useState } from 'react';
import type { TripActionError, TripSummary } from '@/app/[locale]/mi-viaje/actions';
import { clearSessionHint } from '@/features/account/model/session';
import {
  type DraftAddResult,
  type DraftKind,
  useDraftStore,
} from '@/features/trip-draft/model/draftStore';

export type DialogStatus =
  | { phase: 'loading' }
  | { phase: 'ready'; trips: TripSummary[] }
  | { phase: 'adding'; trips: TripSummary[]; tripId: string }
  | { phase: 'added'; trips: TripSummary[]; tripName: string }
  | { phase: 'error'; trips: TripSummary[]; error: TripActionError }
  /** La sesión venció: el elemento se guardó en el borrador local para no perderlo (US5). */
  | { phase: 'draft'; trips: TripSummary[]; result: DraftAddResult };

export interface AddToTripDialogActions {
  list: () => Promise<{ ok: true; trips: TripSummary[] } | { ok: false; error: TripActionError }>;
  add: (
    language: string,
    tripId: string,
    kind: DraftKind,
    slug: string,
  ) => Promise<{ ok: true } | { ok: false; error: TripActionError }>;
}

type Entry = { locale: string; kind: DraftKind; slug: string; name: string };

/** Sin sesión válida, el indicador sobra: se borra y el elemento va al borrador. */
function saveToDraft({ kind, slug, name }: Entry, trips: TripSummary[]): DialogStatus {
  clearSessionHint();
  return {
    phase: 'draft',
    trips,
    result: useDraftStore.getState().add({ kind, slug, title: name }),
  };
}

/** ViewModel del diálogo: carga los viajes del usuario y agrega la ficha al elegido (US2). */
export function useAddToTripDialogViewModel(entry: Entry, actions: AddToTripDialogActions) {
  const { locale, kind, slug, name } = entry;
  const [status, setStatus] = useState<DialogStatus>({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void actions.list().then((result) => {
      if (cancelled) return;
      if (result.ok) setStatus({ phase: 'ready', trips: result.trips });
      else if (result.error === 'sin-sesion')
        setStatus(saveToDraft({ locale, kind, slug, name }, []));
      else setStatus({ phase: 'error', trips: [], error: result.error });
    });
    return () => {
      cancelled = true;
    };
  }, [actions, locale, kind, slug, name]);

  const trips = 'trips' in status ? status.trips : [];

  const add = async (trip: TripSummary) => {
    setStatus({ phase: 'adding', trips, tripId: trip.tripId });
    const result = await actions.add(locale, trip.tripId, kind, slug);
    if (result.ok) {
      const updated = trips.map((item) =>
        item.tripId === trip.tripId ? { ...item, count: item.count + 1 } : item,
      );
      setStatus({ phase: 'added', trips: updated, tripName: trip.name });
    } else if (result.error === 'sin-sesion') {
      setStatus(saveToDraft(entry, trips));
    } else {
      setStatus({ phase: 'error', trips, error: result.error });
    }
  };

  return { status, trips, add };
}
