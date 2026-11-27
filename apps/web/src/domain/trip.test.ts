import { describe, expect, it } from 'vitest';
import {
  TRIP_LIMITS,
  TripError,
  addCatalogItem,
  applyDetails,
  budgetTotals,
  catalogKey,
  dayCount,
  detailsFieldErrors,
  dayDate,
  groupByDay,
  moveItem,
  newTrip,
  removeItem,
  setItemCost,
  shareTrip,
  toTripView,
  tripDetailsSchema,
  unshareTrip,
  upsertNote,
  type Trip,
} from './trip';

const now = new Date('2026-11-27T15:00:00.000Z');
const details = {
  name: 'Eje cafetero',
  startDate: '2026-12-20',
  endDate: '2026-12-22',
  travelers: 2,
  budget: 1_500_000,
};
const base = () => newTrip({ sub: 'sub-ana', tripId: 'viaje-1', details, now });
const add = (
  trip: Trip,
  id: string,
  slug: string,
  kind: 'sitio' | 'fiesta' | 'plato' | 'experiencia' = 'sitio',
) => addCatalogItem(trip, { id, kind, slug, title: slug }, now);
const orderOf = (trip: Trip, day: number | null) =>
  (groupByDay(trip.items).get(day) ?? []).map((item) => item.id);

describe('fechas', () => {
  it('cuenta los días con ambos extremos', () => {
    expect(dayCount('2026-12-20', '2026-12-22')).toBe(3);
    expect(dayCount('2026-12-31', '2027-01-01')).toBe(2);
    expect(dayDate('2026-12-30', 2)).toBe('2027-01-01');
  });

  it.each([
    [{ ...details, endDate: '2026-12-19' }, 'fin-antes-de-inicio'],
    [{ ...details, endDate: '2027-01-20' }, 'demasiado-largo'],
    [{ ...details, startDate: '2026-02-30' }, undefined],
    [{ ...details, name: '   ' }, undefined],
    [{ ...details, travelers: 0 }, undefined],
    [{ ...details, budget: TRIP_LIMITS.money + 1 }, undefined],
  ])('rechaza %j', (input, message) => {
    const result = tripDetailsSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (message) expect(result.error?.issues.map((i) => i.message)).toContain(message);
  });

  it('acepta un viaje de 30 días y convierte los números del formulario', () => {
    const parsed = tripDetailsSchema.parse({
      ...details,
      endDate: '2027-01-18',
      travelers: '3',
      budget: '0',
    });
    expect(parsed).toMatchObject({ travelers: 3, budget: 0 });
  });
});

describe('agregar y quitar', () => {
  it('agrega a «Sin día» en orden y evita duplicados', () => {
    const trip = add(add(base(), 'a', 'cocora'), 'b', 'salento');
    expect(orderOf(trip, null)).toEqual(['a', 'b']);
    expect(() => add(trip, 'c', 'cocora')).toThrowError(new TripError('duplicado'));
    expect(add(trip, 'c', 'cocora', 'fiesta').items).toHaveLength(3);
  });

  it('respeta el límite de elementos', () => {
    let trip = base();
    for (let i = 0; i < TRIP_LIMITS.items; i++) trip = add(trip, `i${i}`, `s${i}`);
    expect(() => add(trip, 'extra', 'extra')).toThrowError(new TripError('limite'));
  });

  it('quitar renumera el día', () => {
    const trip = removeItem(add(add(add(base(), 'a', 'x'), 'b', 'y'), 'c', 'z'), 'b', now);
    expect(trip.items.map((i) => [i.id, i.order])).toEqual([
      ['a', 0],
      ['c', 1],
    ]);
  });
});

describe('mover', () => {
  const three = () => add(add(add(base(), 'a', 'x'), 'b', 'y'), 'c', 'z');

  it('mueve a un día y a una posición', () => {
    let trip = moveItem(three(), 'c', 1, 0, now);
    trip = moveItem(trip, 'a', 1, 0, now);
    expect(orderOf(trip, 1)).toEqual(['a', 'c']);
    expect(orderOf(trip, null)).toEqual(['b']);
  });

  it('reordena dentro del mismo día y limita el índice', () => {
    const trip = moveItem(three(), 'a', null, 99, now);
    expect(orderOf(trip, null)).toEqual(['b', 'c', 'a']);
  });

  it('rechaza un día fuera del viaje o un elemento que no existe', () => {
    expect(() => moveItem(three(), 'a', 3, 0, now)).toThrowError(new TripError('invalido'));
    expect(() => moveItem(three(), 'zzz', 0, 0, now)).toThrowError(new TripError('no-encontrado'));
  });
});

describe('editar los datos', () => {
  it('acortar el viaje manda a «Sin día» los elementos de los días que ya no existen', () => {
    let trip = moveItem(
      moveItem(add(add(add(base(), 'a', 'x'), 'b', 'y'), 'c', 'z'), 'b', 2, 0, now),
      'c',
      0,
      0,
      now,
    );
    trip = applyDetails(trip, { ...details, endDate: '2026-12-21' }, now);
    expect(orderOf(trip, null)).toEqual(['a', 'b']);
    expect(orderOf(trip, 0)).toEqual(['c']);
    expect(trip.endDate).toBe('2026-12-21');
  });
});

describe('notas, costos y compartir', () => {
  it('crea y edita una nota, y la mueve de día', () => {
    let trip = upsertNote(
      base(),
      { id: 'n', title: 'Vuelo', text: 'AV 9254 a las 6:10', day: 0 },
      now,
    );
    expect(trip.items[0]).toMatchObject({ kind: 'nota', title: 'Vuelo', day: 0 });
    trip = upsertNote(trip, { id: 'n', title: 'Vuelo de ida', text: '', day: 1 }, now);
    expect(trip.items[0]).toMatchObject({ title: 'Vuelo de ida', text: null, day: 1, order: 0 });
    expect(() => upsertNote(trip, { id: 'm', title: '', text: '', day: null }, now)).toThrowError(
      new TripError('invalido'),
    );
  });

  it('pone y quita costos dentro del límite', () => {
    const trip = setItemCost(add(base(), 'a', 'x'), 'a', 120_000, now);
    expect(trip.items[0]?.cost).toBe(120_000);
    expect(setItemCost(trip, 'a', null, now).items[0]?.cost).toBeNull();
    expect(() => setItemCost(trip, 'a', -1, now)).toThrowError(new TripError('invalido'));
  });

  it('comparte y deja de compartir', () => {
    const shared = shareTrip(base(), 'abc', now);
    expect(shared.shareId).toBe('abc');
    expect(unshareTrip(shared, now).shareId).toBeNull();
  });
});

describe('budgetTotals', () => {
  it('suma por categoría, el total y el saldo, y avisa si se pasa', () => {
    const totals = budgetTotals(
      [
        { kind: 'sitio', cost: 100 },
        { kind: 'sitio', cost: 50 },
        { kind: 'plato', cost: null },
        { kind: 'nota', cost: 900 },
      ],
      1000,
    );
    expect(totals.byKind).toMatchObject({ sitio: 150, plato: 0, nota: 900, fiesta: 0 });
    expect(totals).toMatchObject({ total: 1050, remaining: -50, over: true });
  });
});

describe('errores por campo (US1, escenario 3)', () => {
  const form = {
    name: 'Eje cafetero',
    startDate: '2026-12-20',
    endDate: '2026-12-22',
    travelers: '2',
    budget: '0',
  };

  it('sin errores devuelve null', () => {
    expect(detailsFieldErrors(form)).toBeNull();
  });

  it('pone las reglas entre fechas en el campo «Hasta»', () => {
    expect(detailsFieldErrors({ ...form, endDate: '2026-12-19' })).toEqual({
      endDate: 'fin-antes-de-inicio',
    });
    expect(detailsFieldErrors({ ...form, endDate: '2027-01-20' })).toEqual({
      endDate: 'demasiado-largo',
    });
  });

  it('marca cada campo fuera de rango con su nombre', () => {
    expect(
      detailsFieldErrors({
        ...form,
        name: ' ',
        travelers: '0',
        budget: '-1',
        startDate: '2026-02-30',
      }),
    ).toEqual({
      name: 'name',
      travelers: 'travelers',
      budget: 'budget',
      startDate: 'startDate',
    });
  });
});

describe('vista del viaje', () => {
  it('quita el dueño y la marca de migración, y conserva lo demás', () => {
    const trip = { ...shareTrip(add(base(), 'e1', 'cocora'), 'abc', now), migrationId: 'mig-1' };
    const view = toTripView(trip);
    expect(view).not.toHaveProperty('sub');
    expect(view).not.toHaveProperty('migrationId');
    expect(view).toMatchObject({
      tripId: trip.tripId,
      shareId: 'abc',
      version: trip.version,
      items: trip.items,
    });
    expect(Object.keys(view).sort()).toEqual([
      'budget',
      'createdAt',
      'endDate',
      'items',
      'name',
      'shareId',
      'startDate',
      'travelers',
      'tripId',
      'updatedAt',
      'version',
    ]);
  });

  it('las operaciones aceptan la vista y devuelven la vista (ViewModel optimista)', () => {
    const view = toTripView(add(base(), 'e1', 'cocora'));
    const moved = moveItem(view, 'e1', 0, 0, now);
    expect(moved).not.toHaveProperty('sub');
    expect(moved.items[0]?.day).toBe(0);
  });

  it('arma la llave de una ficha', () => {
    expect(catalogKey('sitio', 'valle-de-cocora')).toBe('sitio:valle-de-cocora');
  });
});
