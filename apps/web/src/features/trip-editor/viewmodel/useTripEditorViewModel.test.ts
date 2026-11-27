import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type TripItem,
  type TripView,
  addCatalogItem,
  groupByDay,
  moveItem,
  newTrip,
  removeItem,
  shareTrip,
  toTripView,
} from '@/domain/trip';
import {
  type EditorOutcome,
  type TripEditorActions,
  useTripEditorViewModel,
} from './useTripEditorViewModel';

const refresh = vi.fn();
// Como en Next.js, el router es el mismo objeto en cada render.
const router = { refresh };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const now = new Date('2026-11-27T15:00:00.000Z');

/** Viaje de 3 días en la versión 1: a, b y c en «Sin día». */
function base(): TripView {
  let trip = toTripView(
    newTrip({
      sub: 's',
      tripId: 'viaje-1',
      details: {
        name: 'Eje cafetero',
        startDate: '2026-12-20',
        endDate: '2026-12-22',
        travelers: 2,
        budget: 100,
      },
      now,
    }),
  );
  for (const id of ['a', 'b', 'c'])
    trip = addCatalogItem(
      trip,
      { id, kind: 'sitio', slug: `s-${id}`, title: id.toUpperCase() },
      now,
    );
  return trip;
}

const ids = (trip: TripView, day: number | null) =>
  (groupByDay(trip.items).get(day) ?? []).map((item) => item.id);
const saved = (trip: TripView, version: number): EditorOutcome => ({
  ok: true,
  trip: { ...trip, version },
});

/** Deja que terminen las promesas encadenadas de la acción y que React confirme el resultado. */
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

/**
 * React 19 agrupa las transiciones asíncronas en curso: una acción que nunca termina retendría las de
 * las pruebas siguientes. Las acciones «pendientes» se liberan siempre al final de cada prueba.
 */
const held: Array<() => void> = [];
function hold(): Promise<EditorOutcome> {
  const answer = deferred<EditorOutcome>();
  held.push(() => answer.resolve({ ok: false, error: 'no-disponible' }));
  return answer.promise;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function fakeActions(): {
  [K in keyof TripEditorActions]: ReturnType<typeof vi.fn<TripEditorActions[K]>>;
} {
  return {
    move: vi.fn<TripEditorActions['move']>(),
    remove: vi.fn<TripEditorActions['remove']>(),
    setCost: vi.fn<TripEditorActions['setCost']>(),
    saveNote: vi.fn<TripEditorActions['saveNote']>(),
    saveDetails: vi.fn<TripEditorActions['saveDetails']>(),
    share: vi.fn<TripEditorActions['share']>(),
    unshare: vi.fn<TripEditorActions['unshare']>(),
    addFromCatalog: vi.fn<TripEditorActions['addFromCatalog']>(),
  };
}

const nameOf = (item: TripItem) => `Nombre ${item.title}`;

function setup(initial = base()) {
  const actions = fakeActions();
  const hook = renderHook(
    ({ trip }) => useTripEditorViewModel(trip, actions, { locale: 'es', nameOf }),
    {
      initialProps: { trip: initial },
    },
  );
  return { actions, ...hook };
}

beforeEach(() => refresh.mockReset());
afterEach(async () => {
  await act(async () => held.splice(0).forEach((release) => release()));
  await settle();
  cleanup();
});

describe('cambios optimistas (FR-009, research D-03)', () => {
  it('el movimiento se ve antes de que responda el servidor y queda al confirmarse', async () => {
    const { actions, result } = setup();
    const answer = deferred<EditorOutcome>();
    actions.move.mockReturnValueOnce(answer.promise);

    await act(async () => result.current.move('c', 0, 0));
    expect(ids(result.current.trip, 0)).toEqual(['c']);
    expect(result.current.pending).toBe(true);
    expect(actions.move).toHaveBeenCalledWith('viaje-1', 1, 'c', 0, 0);

    await act(async () => answer.resolve(saved(moveItem(base(), 'c', 0, 0, now), 2)));
    expect(ids(result.current.trip, 0)).toEqual(['c']);
    expect(result.current.trip.version).toBe(2);
    expect(result.current.pending).toBe(false);
  });

  it('si el servidor rechaza el cambio, se deshace y se avisa', async () => {
    const { actions, result } = setup();
    actions.remove.mockResolvedValueOnce({ ok: false, error: 'no-disponible' });
    await act(async () => result.current.remove('a'));
    expect(ids(result.current.trip, null)).toEqual(['a', 'b', 'c']);
    expect(result.current.notice).toEqual({ kind: 'error', error: 'no-disponible' });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('si la acción no llega al servidor, se trata como «no disponible»', async () => {
    const { actions, result } = setup();
    actions.setCost.mockRejectedValueOnce(new Error('sin red'));
    await act(async () => result.current.setCost('a', 5000));
    expect(result.current.trip.items.find((item) => item.id === 'a')?.cost).toBeNull();
    expect(result.current.notice).toEqual({ kind: 'error', error: 'no-disponible' });
  });

  it('un conflicto avisa y recarga el viaje del servidor (FR-008, US3 escenario 5)', async () => {
    const { actions, result, rerender } = setup();
    actions.move.mockResolvedValueOnce({ ok: false, error: 'conflicto' });
    await act(async () => result.current.move('a', 1, 0));
    expect(result.current.notice).toEqual({ kind: 'error', error: 'conflicto' });
    expect(refresh).toHaveBeenCalledTimes(1);

    // La recarga trae la versión de la otra pestaña: gana sobre lo local.
    const fromServer = { ...moveItem(base(), 'b', 2, 0, now), version: 5 };
    rerender({ trip: fromServer });
    expect(ids(result.current.trip, 2)).toEqual(['b']);
    expect(result.current.trip.version).toBe(5);
  });
});

describe('fila de acciones', () => {
  it('dos cambios seguidos salen en orden y el segundo usa la versión que confirmó el primero', async () => {
    const { actions, result } = setup();
    const first = deferred<EditorOutcome>();
    actions.move.mockReturnValueOnce(first.promise);
    actions.remove.mockImplementationOnce(async (_trip, expected) =>
      saved(removeItem(moveItem(base(), 'a', 0, 0, now), 'b', now), expected + 1),
    );

    await act(async () => {
      result.current.move('a', 0, 0);
      result.current.remove('b');
    });
    expect(actions.remove).not.toHaveBeenCalled();
    await act(async () => first.resolve(saved(moveItem(base(), 'a', 0, 0, now), 2)));

    expect(actions.remove).toHaveBeenCalledWith('viaje-1', 2, 'b');
    expect(result.current.trip.version).toBe(3);
    expect(ids(result.current.trip, null)).toEqual(['c']);
  });
});

describe('mover con botones y anuncios (US3, escenario 3)', () => {
  it('«Mover a…» lleva al final del día, anuncia la posición y pide el foco para el elemento', async () => {
    const { actions, result } = setup();
    actions.move.mockImplementation(async (_t, expected, itemId, day, index) =>
      saved(moveItem(base(), itemId, day, index, now), expected + 1),
    );
    await act(async () => result.current.moveTo('b', 1));
    expect(actions.move).toHaveBeenCalledWith('viaje-1', 1, 'b', 1, 0);
    expect(result.current.notice).toEqual({ kind: 'moved', name: 'Nombre B', day: 1, position: 1 });
    expect(result.current.focusRequest).toEqual({ itemId: 'b' });
  });

  it('«Subir» y «Bajar» no salen del grupo', async () => {
    const { actions, result } = setup();
    actions.move.mockImplementation(async (_t, expected, itemId, day, index) =>
      saved(moveItem(base(), itemId, day, index, now), expected + 1),
    );
    await act(async () => result.current.moveBy('a', -1));
    await act(async () => result.current.moveBy('c', 1));
    expect(actions.move).not.toHaveBeenCalled();
    await act(async () => result.current.moveBy('a', 1));
    expect(actions.move).toHaveBeenCalledWith('viaje-1', 1, 'a', null, 1);
    expect(result.current.notice).toMatchObject({ kind: 'moved', position: 2 });
  });

  it('arrastrar no anuncia (lo anuncia dnd-kit) y borra el aviso anterior', async () => {
    const { actions, result } = setup();
    actions.remove.mockResolvedValueOnce({ ok: false, error: 'no-disponible' });
    await act(async () => result.current.remove('a'));
    actions.move.mockImplementation(async (_t, expected, itemId, day, index) =>
      saved(moveItem(base(), itemId, day, index, now), expected + 1),
    );
    await act(async () => result.current.move('a', 0, 0));
    expect(result.current.notice).toBeNull();
    expect(result.current.focusRequest).toBeNull();
  });

  it('quitar anuncia el nombre y lleva el foco al título del grupo', async () => {
    const { actions, result } = setup();
    actions.remove.mockImplementation(async (_t, expected, itemId) =>
      saved(removeItem(base(), itemId, now), expected + 1),
    );
    await act(async () => result.current.remove('b'));
    expect(result.current.notice).toEqual({ kind: 'removed', name: 'Nombre B' });
    expect(result.current.focusRequest).toEqual({ groupId: 'sin-dia' });
    expect(ids(result.current.trip, null)).toEqual(['a', 'c']);
  });
});

describe('presupuesto, notas, datos y compartir', () => {
  it('los totales se derivan del estado optimista (US4)', async () => {
    const { actions, result } = setup();
    actions.setCost.mockReturnValueOnce(hold());
    await act(async () => result.current.setCost('a', 150));
    expect(result.current.totals).toMatchObject({ total: 150, remaining: -50, over: true });
  });

  it('no envía un costo que no cambió', async () => {
    const { actions, result } = setup();
    await act(async () => result.current.setCost('a', null));
    expect(actions.setCost).not.toHaveBeenCalled();
  });

  it('una nota nueva lleva un identificador y se guarda en su día (US3, escenario 4)', async () => {
    const { actions, result } = setup();
    actions.saveNote.mockReturnValueOnce(hold());
    await act(async () => result.current.saveNote({ title: 'Hotel', text: 'Reserva 12', day: 2 }));
    const note = result.current.trip.items.find((item) => item.kind === 'nota');
    expect(note).toMatchObject({ title: 'Hotel', text: 'Reserva 12', day: 2 });
    expect(actions.saveNote).toHaveBeenCalledWith(
      'viaje-1',
      1,
      expect.objectContaining({ id: note?.id, title: 'Hotel' }),
    );
  });

  it('los datos inválidos se marcan por campo sin llamar al servidor', async () => {
    const { actions, result } = setup();
    const data = new FormData();
    for (const [key, value] of Object.entries({
      name: 'X',
      startDate: '2026-12-20',
      endDate: '2026-12-19',
      travelers: '2',
      budget: '0',
    })) {
      data.set(key, value);
    }
    await act(async () => result.current.saveDetails(data));
    expect(result.current.detailsErrors).toEqual({ endDate: 'fin-antes-de-inicio' });
    expect(actions.saveDetails).not.toHaveBeenCalled();
  });

  it('guardar los datos acorta el viaje al instante y luego recarga las fiestas y el clima', async () => {
    let trip = moveItem(base(), 'a', 2, 0, now);
    const { actions, result } = setup(trip);
    const data = new FormData();
    for (const [key, value] of Object.entries({
      name: 'Corto',
      startDate: '2026-12-20',
      endDate: '2026-12-21',
      travelers: '2',
      budget: '0',
    })) {
      data.set(key, value);
    }
    const answer = deferred<Awaited<ReturnType<TripEditorActions['saveDetails']>>>();
    actions.saveDetails.mockReturnValueOnce(answer.promise);
    await act(async () => result.current.saveDetails(data));
    expect(result.current.trip.name).toBe('Corto');
    expect(result.current.groups).toHaveLength(3);
    expect(ids(result.current.trip, null)).toContain('a');

    trip = { ...result.current.trip, version: 2 };
    await act(async () => answer.resolve({ status: 'ok', trip }));
    await settle();
    expect(result.current.notice).toEqual({ kind: 'saved' });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('compartir espera el enlace del servidor; dejar de compartir lo quita al instante (US6)', async () => {
    const { actions, result } = setup();
    actions.share.mockResolvedValueOnce(saved(shareTrip(base(), 'AbCdEfGhIjKlMnOpQrStUv', now), 2));
    await act(async () => result.current.share());
    await settle();
    expect(result.current.trip.shareId).toBe('AbCdEfGhIjKlMnOpQrStUv');
    expect(result.current.notice).toEqual({ kind: 'shared' });

    actions.unshare.mockReturnValueOnce(hold());
    await act(async () => result.current.unshare());
    expect(result.current.trip.shareId).toBeNull();
  });

  it('agregar una fiesta sugerida la pone en «Sin día» y no envía versión (US7)', async () => {
    const { actions, result } = setup();
    actions.addFromCatalog.mockReturnValueOnce(hold());
    await act(async () => result.current.addFestival('feria-de-manizales', 'Feria de Manizales'));
    expect(actions.addFromCatalog).toHaveBeenCalledWith(
      'es',
      'viaje-1',
      'fiesta',
      'feria-de-manizales',
    );
    expect(result.current.trip.items.at(-1)).toMatchObject({
      kind: 'fiesta',
      slug: 'feria-de-manizales',
      day: null,
    });
  });
});
