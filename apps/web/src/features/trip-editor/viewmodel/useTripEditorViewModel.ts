'use client';

import { useRouter } from 'next/navigation';
import { useOptimistic, useRef, useState, useTransition } from 'react';
import type { TripActionError, TripFormState } from '@/app/[locale]/mi-viaje/actions';
import {
  TRIP_FIELDS,
  type CatalogKind,
  type TripField,
  type TripFieldError,
  type TripItem,
  type TripView,
  addCatalogItem,
  applyDetails,
  budgetTotals,
  detailsFieldErrors,
  moveItem,
  removeItem,
  setItemCost,
  tripDetailsSchema,
  unshareTrip,
  upsertNote,
} from '@/domain/trip';
import { type GroupId, boardGroups, groupId, locate } from '../model/board';

export type EditorOutcome =
  | { ok: true; trip: TripView }
  | { ok: false; error: TripActionError; fields?: Partial<Record<TripField, TripFieldError>> };

export interface NoteInput {
  id?: string;
  title: string;
  text: string;
  day: number | null;
}

/** Las Server Actions del viaje; se inyectan para probar el ViewModel sin servidor. */
export interface TripEditorActions {
  move: (
    tripId: string,
    expected: number,
    itemId: string,
    toDay: number | null,
    index: number,
  ) => Promise<EditorOutcome>;
  remove: (tripId: string, expected: number, itemId: string) => Promise<EditorOutcome>;
  setCost: (
    tripId: string,
    expected: number,
    itemId: string,
    cost: number | null,
  ) => Promise<EditorOutcome>;
  saveNote: (tripId: string, expected: number, note: NoteInput) => Promise<EditorOutcome>;
  saveDetails: (
    tripId: string,
    expected: number,
    previous: TripFormState,
    formData: FormData,
  ) => Promise<TripFormState>;
  share: (tripId: string, expected: number) => Promise<EditorOutcome>;
  unshare: (tripId: string, expected: number) => Promise<EditorOutcome>;
  addFromCatalog: (
    language: string,
    tripId: string,
    kind: CatalogKind,
    slug: string,
  ) => Promise<EditorOutcome>;
}

export type EditorNotice =
  | { kind: 'error'; error: TripActionError }
  | { kind: 'saved' }
  | { kind: 'note-saved' }
  | { kind: 'shared' }
  | { kind: 'revoked' }
  | { kind: 'added'; name: string }
  | { kind: 'removed'; name: string }
  | { kind: 'moved'; name: string; day: number | null; position: number };

/** A dónde va el foco después de un cambio hecho con botones (el elemento cambia de lista). */
export type FocusRequest = { itemId: string } | { groupId: GroupId };

type Change = (trip: TripView) => TripView;

interface EditorOptions {
  locale: string;
  /** Nombre que se muestra de un elemento, para los anuncios. */
  nameOf: (item: TripItem) => string;
}

const now = () => new Date();

/**
 * ViewModel del editor (US3, US4, US6; research D-02 y D-03).
 * - El estado del servidor es el viaje confirmado; encima, `useOptimistic` aplica la misma función pura
 *   del dominio que aplicará el servidor, así que el cambio se ve de inmediato (FR-009). Si la acción
 *   falla, React descarta el estado optimista y queda el confirmado.
 * - Las acciones salen en fila, cada una con la última versión que confirmó el servidor, para que dos
 *   cambios rápidos de esta pestaña no choquen entre sí. Si otra pestaña guardó antes, el servidor
 *   responde `conflicto` y se recarga el viaje (FR-008).
 */
export function useTripEditorViewModel(
  initial: TripView,
  actions: TripEditorActions,
  options: EditorOptions,
) {
  const router = useRouter();
  const [local, setLocal] = useState<TripView | null>(null);
  // El viaje del servidor (props) gana cuando es más nuevo, por ejemplo tras recargar por un conflicto.
  const confirmed = local && local.version >= initial.version ? local : initial;
  const [trip, applyOptimistic] = useOptimistic(confirmed, (state: TripView, change: Change) => {
    try {
      return change(state);
    } catch {
      // El dominio rechazó el cambio (duplicado, límite…): se ve igual y el servidor dará el error.
      return state;
    }
  });
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<EditorNotice | null>(null);
  const [detailsErrors, setDetailsErrors] = useState<Partial<Record<TripField, TripFieldError>>>(
    {},
  );
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const lastVersion = useRef(0);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const groups = boardGroups(trip);
  const totals = budgetTotals(trip.items, trip.budget);

  function send(call: (version: number) => Promise<EditorOutcome>): Promise<EditorOutcome> {
    const base = confirmed.version;
    const run = queue.current.then(async (): Promise<EditorOutcome> => {
      try {
        return await call(Math.max(lastVersion.current, base));
      } catch {
        return { ok: false, error: 'no-disponible' };
      }
    });
    queue.current = run.then((outcome) => {
      if (outcome.ok) lastVersion.current = Math.max(lastVersion.current, outcome.trip.version);
    });
    return run;
  }

  function perform(
    change: Change,
    call: (version: number) => Promise<EditorOutcome>,
    feedback: { done?: EditorNotice; after?: () => void; keepNotice?: boolean } = {},
  ) {
    // El aviso anterior ya no describe lo que pasa: se borra, salvo que el cambio ya puso el suyo.
    if (!feedback.keepNotice) setNotice(null);
    startTransition(async () => {
      applyOptimistic(change);
      const outcome = await send(call);
      startTransition(() => {
        if (outcome.ok) {
          setLocal(outcome.trip);
          if (feedback.done) setNotice(feedback.done);
          feedback.after?.();
          return;
        }
        setNotice({ kind: 'error', error: outcome.error });
        if (outcome.fields) setDetailsErrors(outcome.fields);
        if (outcome.error === 'conflicto' || outcome.error === 'no-encontrado') router.refresh();
      });
    });
  }

  const findItem = (itemId: string) => trip.items.find((item) => item.id === itemId);

  /** Mueve un elemento. Con `announce`, el cambio se anuncia y el foco sigue al elemento. */
  function move(itemId: string, day: number | null, index: number, announce = false) {
    const item = findItem(itemId);
    if (!item) return;
    if (announce) {
      let position = index + 1;
      try {
        position =
          (locate(boardGroups(moveItem(trip, itemId, day, index, now())), itemId)?.index ?? index) +
          1;
      } catch {
        // Movimiento inválido: el servidor responderá el error.
      }
      setNotice({ kind: 'moved', name: options.nameOf(item), day, position });
      setFocusRequest({ itemId });
    } else {
      setFocusRequest(null);
    }
    perform(
      (state) => moveItem(state, itemId, day, index, now()),
      (version) => actions.move(trip.tripId, version, itemId, day, index),
      { keepNotice: announce },
    );
  }

  function moveBy(itemId: string, delta: -1 | 1) {
    const at = locate(groups, itemId);
    if (!at) return;
    const index = at.index + delta;
    if (index < 0 || index >= at.group.items.length) return;
    move(itemId, at.group.day, index, true);
  }

  function moveTo(itemId: string, day: number | null) {
    const at = locate(groups, itemId);
    const target = groups.find((group) => group.day === day);
    if (!at || !target || at.group.day === day) return;
    move(itemId, day, target.items.length, true);
  }

  function remove(itemId: string) {
    const item = findItem(itemId);
    if (!item) return;
    setNotice({ kind: 'removed', name: options.nameOf(item) });
    setFocusRequest({ groupId: groupId(item.day) });
    perform(
      (state) => removeItem(state, itemId, now()),
      (version) => actions.remove(trip.tripId, version, itemId),
      { keepNotice: true },
    );
  }

  function setCost(itemId: string, cost: number | null) {
    const item = findItem(itemId);
    if (!item || item.cost === cost) return;
    perform(
      (state) => setItemCost(state, itemId, cost, now()),
      (version) => actions.setCost(trip.tripId, version, itemId, cost),
    );
  }

  function saveNote(note: NoteInput) {
    const withId = { ...note, id: note.id ?? crypto.randomUUID() };
    perform(
      (state) => upsertNote(state, withId, now()),
      (version) => actions.saveNote(trip.tripId, version, withId),
      { done: { kind: 'note-saved' } },
    );
  }

  /** Datos del viaje (US1). Al guardar se recarga la página: las fiestas y el clima dependen de las fechas. */
  function saveDetails(formData: FormData) {
    const raw = Object.fromEntries(TRIP_FIELDS.map((field) => [field, formData.get(field) ?? '']));
    const fields = detailsFieldErrors(raw);
    if (fields) {
      setDetailsErrors(fields);
      setNotice({ kind: 'error', error: 'invalido' });
      return;
    }
    setDetailsErrors({});
    const details = tripDetailsSchema.parse(raw);
    perform(
      (state) => applyDetails(state, details, now()),
      async (version) => {
        const state = await actions.saveDetails(trip.tripId, version, { status: 'idle' }, formData);
        if (state.status === 'ok') return { ok: true, trip: state.trip };
        return {
          ok: false,
          error: state.status === 'error' ? state.error : 'no-disponible',
          fields: state.status === 'error' ? state.fields : undefined,
        };
      },
      { done: { kind: 'saved' }, after: () => router.refresh() },
    );
  }

  function share() {
    perform(
      (state) => state,
      (version) => actions.share(trip.tripId, version),
      { done: { kind: 'shared' } },
    );
  }

  function unshare() {
    perform(
      (state) => unshareTrip(state, now()),
      (version) => actions.unshare(trip.tripId, version),
      { done: { kind: 'revoked' } },
    );
  }

  /** Agrega una fiesta sugerida (US7, escenario 2). El servidor pone el nombre desde el catálogo. */
  function addFestival(slug: string, name: string) {
    perform(
      (state) =>
        addCatalogItem(state, { id: `nuevo-${slug}`, kind: 'fiesta', slug, title: name }, now()),
      () => actions.addFromCatalog(options.locale, trip.tripId, 'fiesta', slug),
      { done: { kind: 'added', name } },
    );
  }

  return {
    trip,
    groups,
    totals,
    pending,
    notice,
    detailsErrors,
    focusRequest,
    move,
    moveBy,
    moveTo,
    remove,
    setCost,
    saveNote,
    saveDetails,
    share,
    unshare,
    addFestival,
  };
}

export type TripEditorViewModel = ReturnType<typeof useTripEditorViewModel>;
