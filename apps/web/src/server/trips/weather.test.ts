import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type CatalogRef,
  type TripView,
  addCatalogItem,
  moveItem,
  newTrip,
  toTripView,
  upsertNote,
} from '@/domain/trip';
import { type Fetcher, clearWeatherCache, placesByDay, weatherForTrip } from './weather';

const created = new Date('2026-11-27T15:00:00.000Z');
const refs: Record<string, CatalogRef | null> = {
  'sitio:cocora': {
    name: 'Valle de Cocora',
    href: '/sitios/cocora',
    place: 'Salento, Quindío',
    coords: [4.637, -75.487],
  },
  'sitio:monserrate': {
    name: 'Monserrate',
    href: '/sitios/monserrate',
    place: 'Bogotá D. C.',
    coords: [4.605, -74.056],
  },
  'plato:bandeja': { name: 'Bandeja paisa', href: '/platos/bandeja', place: null, coords: null },
};

function trip(startDate: string, endDate: string): TripView {
  let value = toTripView(
    newTrip({
      sub: 's',
      tripId: 't',
      details: { name: 'X', startDate, endDate, travelers: 1, budget: 0 },
      now: created,
    }),
  );
  value = addCatalogItem(
    value,
    { id: 'p', kind: 'plato', slug: 'bandeja', title: 'Bandeja' },
    created,
  );
  value = addCatalogItem(
    value,
    { id: 'c', kind: 'sitio', slug: 'cocora', title: 'Cocora' },
    created,
  );
  value = addCatalogItem(
    value,
    { id: 'm', kind: 'sitio', slug: 'monserrate', title: 'Monserrate' },
    created,
  );
  value = upsertNote(value, { id: 'n', title: 'Vuelo', text: '', day: 0 }, created);
  // Día 1: nota, plato (sin coordenadas) y Cocora; día 2: Monserrate; día 3: vacío.
  value = moveItem(value, 'p', 0, 1, created);
  value = moveItem(value, 'c', 0, 2, created);
  return moveItem(value, 'm', 1, 0, created);
}

/** Respuesta diaria de Open-Meteo para una lista de fechas. */
function daily(
  dates: string[],
  max: number,
  min: number,
  extra: Record<string, (number | null)[]>,
) {
  return {
    daily: {
      time: dates,
      temperature_2m_max: dates.map(() => max),
      temperature_2m_min: dates.map(() => min),
      ...extra,
    },
  };
}

const okJson = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

beforeEach(() => clearWeatherCache());

describe('placesByDay', () => {
  it('toma el primer elemento con coordenadas de cada día; si no hay, el primero del viaje', () => {
    const places = placesByDay(trip('2026-12-01', '2026-12-03'), refs);
    expect(places.map((place) => place?.name)).toEqual([
      'Salento, Quindío',
      'Bogotá D. C.',
      'Salento, Quindío',
    ]);
  });

  it('sin fichas con coordenadas no hay lugares', () => {
    const value = toTripView(
      newTrip({
        sub: 's',
        tripId: 't',
        details: {
          name: 'X',
          startDate: '2026-12-01',
          endDate: '2026-12-01',
          travelers: 1,
          budget: 0,
        },
        now: created,
      }),
    );
    expect(
      placesByDay(
        addCatalogItem(value, { id: 'p', kind: 'plato', slug: 'bandeja', title: 'B' }, created),
        refs,
      ),
    ).toEqual([null]);
  });
});

describe('weatherForTrip (US7, escenario 3)', () => {
  const today = new Date('2026-11-27T15:00:00.000Z');

  it('si empieza en 16 días o menos, da el pronóstico de cada día con una sola consulta', async () => {
    const fetcher = vi.fn<Fetcher>((url) => {
      expect(url).toContain('https://api.open-meteo.com/v1/forecast?');
      expect(url).toContain('latitude=4.637%2C4.605');
      expect(url).toContain('start_date=2026-12-01&end_date=2026-12-03');
      const dates = ['2026-12-01', '2026-12-02', '2026-12-03'];
      return okJson([
        daily(dates, 21.4, 13.6, { precipitation_probability_max: [80, 60, 40] }),
        daily(dates, 19.2, 9.8, { precipitation_probability_max: [10, 20, null] }),
      ]);
    });
    const weather = await weatherForTrip(trip('2026-12-01', '2026-12-03'), refs, today, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(weather).toEqual({
      mode: 'forecast',
      days: [
        { day: 0, date: '2026-12-01', place: 'Salento, Quindío', max: 21, min: 14, rain: 80 },
        { day: 1, date: '2026-12-02', place: 'Bogotá D. C.', max: 19, min: 10, rain: 20 },
        { day: 2, date: '2026-12-03', place: 'Salento, Quindío', max: 21, min: 14, rain: 40 },
      ],
    });
  });

  it('si empieza después, da el clima típico del mes con los tres años anteriores', async () => {
    const fetcher = vi.fn<Fetcher>((url) => {
      expect(url).toContain('https://climate-api.open-meteo.com/v1/climate?');
      expect(url).toContain('start_date=2024-01-01&end_date=2026-12-31');
      const dates = ['2024-02-01', '2024-03-01', '2025-03-01', '2026-03-01', '2026-03-02'];
      return okJson([
        daily(dates, 20, 10, { precipitation_sum: [9, 0.2, 5, 1, 3] }),
        daily(dates, 18, 8, { precipitation_sum: [0, 0, 0, 0, 0] }),
      ]);
    });
    const weather = await weatherForTrip(trip('2027-03-10', '2027-03-12'), refs, today, fetcher);
    expect(weather).toEqual({
      mode: 'typical',
      months: [{ month: 3, place: 'Salento, Quindío', max: 20, min: 10, rainyDays: 1 }],
    });
  });

  it('si Open-Meteo falla o tarda, no hay sección del clima', async () => {
    const failing = vi.fn<Fetcher>(() => Promise.resolve(new Response('error', { status: 503 })));
    expect(await weatherForTrip(trip('2026-12-01', '2026-12-03'), refs, today, failing)).toBeNull();
    const rejecting = vi.fn<Fetcher>(() => Promise.reject(new Error('timeout')));
    expect(
      await weatherForTrip(trip('2026-12-04', '2026-12-05'), refs, today, rejecting),
    ).toBeNull();
  });

  it('un viaje que ya terminó o sin lugares no consulta nada', async () => {
    const fetcher = vi.fn<Fetcher>();
    expect(await weatherForTrip(trip('2026-11-01', '2026-11-03'), refs, today, fetcher)).toBeNull();
    expect(await weatherForTrip(trip('2026-12-01', '2026-12-03'), {}, today, fetcher)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('guarda la respuesta una hora: la misma consulta no se repite', async () => {
    const dates = ['2026-12-01', '2026-12-02', '2026-12-03'];
    const fetcher = vi.fn<Fetcher>(() =>
      okJson([
        daily(dates, 20, 10, { precipitation_probability_max: [1, 2, 3] }),
        daily(dates, 18, 8, { precipitation_probability_max: [1, 2, 3] }),
      ]),
    );
    await weatherForTrip(trip('2026-12-01', '2026-12-03'), refs, today, fetcher);
    await weatherForTrip(
      trip('2026-12-01', '2026-12-03'),
      refs,
      new Date(today.getTime() + 30 * 60_000),
      fetcher,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    await weatherForTrip(
      trip('2026-12-01', '2026-12-03'),
      refs,
      new Date(today.getTime() + 61 * 60_000),
      fetcher,
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
