import 'server-only';
import { z } from 'zod';
import {
  type CatalogRef,
  type TripItem,
  type TripView,
  catalogKey,
  dayCount,
  dayDate,
} from '@/domain/trip';
import { todayInColombia } from '@/server/application/trips/use-cases';
import { tripMonths } from './context';

/**
 * Clima del viaje con Open-Meteo, que no pide llave (US7, escenario 3; research D-08):
 * - si el viaje empieza en 16 días o menos, el pronóstico de cada día;
 * - si empieza después, el clima típico de cada mes (promedio de los tres años anteriores en la API de
 *   clima, con corrección de sesgo).
 * Las respuestas se guardan una hora en memoria. Si algo falla, devuelve `null` y la sección no aparece.
 */
export const FORECAST_DAYS = 16;
const MAX_PLACES = 8;
const TTL_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 3000;
const CACHE_LIMIT = 200;
const CLIMATE_MODEL = 'MRI_AGCM3_2_S';
const RAINY_DAY_MM = 1;

export interface WeatherPlace {
  name: string;
  coords: readonly [number, number];
}
export interface ForecastDay {
  day: number;
  date: string;
  place: string;
  max: number;
  min: number;
  rain: number | null;
}
export interface TypicalMonth {
  month: number;
  place: string;
  max: number;
  min: number;
  rainyDays: number;
}
export type TripWeather =
  { mode: 'forecast'; days: ForecastDay[] } | { mode: 'typical'; months: TypicalMonth[] };

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

const series = z.array(z.number().nullable());
const dailySchema = z.object({
  daily: z.object({
    time: z.array(z.string()),
    temperature_2m_max: series,
    temperature_2m_min: series,
    precipitation_probability_max: series.optional(),
    precipitation_sum: series.optional(),
  }),
});
type Daily = z.infer<typeof dailySchema>['daily'];

/** Lugar de cada día: el primer elemento del día con coordenadas; si el día no tiene, el primero del viaje. */
export function placesByDay(
  trip: Pick<TripView, 'items' | 'startDate' | 'endDate'>,
  refs: Readonly<Record<string, CatalogRef | null>>,
): (WeatherPlace | null)[] {
  const placeOf = (item: TripItem): WeatherPlace | null => {
    if (item.kind === 'nota' || !item.slug) return null;
    const ref = refs[catalogKey(item.kind, item.slug)];
    return ref?.coords ? { name: ref.place ?? ref.name, coords: ref.coords } : null;
  };
  const ordered = [...trip.items].sort(
    (a, b) =>
      (a.day ?? Number.MAX_SAFE_INTEGER) - (b.day ?? Number.MAX_SAFE_INTEGER) || a.order - b.order,
  );
  const fallback = ordered.map(placeOf).find((place) => place !== null) ?? null;
  return Array.from(
    { length: dayCount(trip.startDate, trip.endDate) },
    (_, day) =>
      ordered
        .filter((item) => item.day === day)
        .map(placeOf)
        .find((place) => place !== null) ?? fallback,
  );
}

const cache = new Map<string, { expires: number; value: Promise<unknown> }>();

/** Limpia la caché (para las pruebas). */
export function clearWeatherCache() {
  cache.clear();
}

function getJson(url: string, fetcher: Fetcher, now: number): Promise<unknown> {
  const hit = cache.get(url);
  if (hit && hit.expires > now) return hit.value;
  const value = fetcher(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' }).then(
    async (response) => {
      if (!response.ok) throw new Error(`Open-Meteo respondió ${response.status}`);
      return response.json() as Promise<unknown>;
    },
  );
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  cache.set(url, { expires: now + TTL_MS, value });
  value.catch(() => cache.delete(url));
  return value;
}

/** Una consulta para varios lugares: Open-Meteo devuelve un arreglo, o un objeto si es uno solo. */
async function dailyFor(
  base: string,
  places: readonly WeatherPlace[],
  params: Record<string, string>,
  fetcher: Fetcher,
  now: number,
): Promise<Daily[]> {
  const query = new URLSearchParams({
    latitude: places.map((place) => place.coords[0].toFixed(3)).join(','),
    longitude: places.map((place) => place.coords[1].toFixed(3)).join(','),
    ...params,
  });
  const body = await getJson(`${base}?${query.toString()}`, fetcher, now);
  const list = Array.isArray(body) ? body : [body];
  return list.map((entry) => dailySchema.parse(entry).daily);
}

const coordsKey = (place: WeatherPlace) =>
  `${place.coords[0].toFixed(3)},${place.coords[1].toFixed(3)}`;

function distinctPlaces(places: readonly (WeatherPlace | null)[]): WeatherPlace[] {
  const seen = new Map<string, WeatherPlace>();
  for (const place of places)
    if (place && !seen.has(coordsKey(place))) seen.set(coordsKey(place), place);
  return [...seen.values()].slice(0, MAX_PLACES);
}

const average = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;
const present = (values: readonly (number | null)[]) =>
  values.filter((value): value is number => value !== null);

async function forecast(
  trip: Pick<TripView, 'startDate'>,
  places: readonly (WeatherPlace | null)[],
  today: string,
  fetcher: Fetcher,
  now: number,
): Promise<ForecastDay[]> {
  const horizon = dayDate(today, FORECAST_DAYS - 1);
  const wanted = places
    .map((place, day) => ({ place, day, date: dayDate(trip.startDate, day) }))
    .filter(
      (entry): entry is { place: WeatherPlace; day: number; date: string } =>
        entry.place !== null && entry.date >= today && entry.date <= horizon,
    );
  const distinct = distinctPlaces(wanted.map((entry) => entry.place));
  if (!wanted.length || !distinct.length) return [];
  const daily = await dailyFor(
    'https://api.open-meteo.com/v1/forecast',
    distinct,
    {
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      timezone: 'America/Bogota',
      start_date: wanted[0]!.date,
      end_date: wanted[wanted.length - 1]!.date,
    },
    fetcher,
    now,
  );
  return wanted.flatMap(({ place, day, date }) => {
    const data =
      daily[distinct.findIndex((candidate) => coordsKey(candidate) === coordsKey(place))];
    const at = data?.time.indexOf(date) ?? -1;
    const max = data?.temperature_2m_max[at];
    const min = data?.temperature_2m_min[at];
    if (!data || at === -1 || max == null || min == null) return [];
    const rain = data.precipitation_probability_max?.[at] ?? null;
    return [{ day, date, place: place.name, max: Math.round(max), min: Math.round(min), rain }];
  });
}

async function typical(
  trip: Pick<TripView, 'startDate' | 'endDate'>,
  places: readonly (WeatherPlace | null)[],
  fetcher: Fetcher,
  now: number,
): Promise<TypicalMonth[]> {
  const months = tripMonths(trip.startDate, trip.endDate).flatMap((month) => {
    const day = places.findIndex(
      (_, index) => Number(dayDate(trip.startDate, index).slice(5, 7)) === month,
    );
    const place = places[day];
    return place ? [{ month, place }] : [];
  });
  const distinct = distinctPlaces(months.map((entry) => entry.place));
  if (!distinct.length) return [];
  const year = Number(trip.startDate.slice(0, 4));
  const years = 3;
  const daily = await dailyFor(
    'https://climate-api.open-meteo.com/v1/climate',
    distinct,
    {
      models: CLIMATE_MODEL,
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
      start_date: `${year - years}-01-01`,
      end_date: `${year - 1}-12-31`,
    },
    fetcher,
    now,
  );
  return months.flatMap(({ month, place }) => {
    const data =
      daily[distinct.findIndex((candidate) => coordsKey(candidate) === coordsKey(place))];
    if (!data) return [];
    const indexes = data.time.flatMap((date, index) =>
      Number(date.slice(5, 7)) === month ? [index] : [],
    );
    const max = present(indexes.map((index) => data.temperature_2m_max[index] ?? null));
    const min = present(indexes.map((index) => data.temperature_2m_min[index] ?? null));
    const rain = present(indexes.map((index) => data.precipitation_sum?.[index] ?? null));
    if (!max.length || !min.length) return [];
    return [
      {
        month,
        place: place.name,
        max: Math.round(average(max)),
        min: Math.round(average(min)),
        rainyDays: Math.round(rain.filter((value) => value >= RAINY_DAY_MM).length / years),
      },
    ];
  });
}

export async function weatherForTrip(
  trip: Pick<TripView, 'items' | 'startDate' | 'endDate'>,
  refs: Readonly<Record<string, CatalogRef | null>>,
  now: Date = new Date(),
  fetcher: Fetcher = fetch,
): Promise<TripWeather | null> {
  try {
    const places = placesByDay(trip, refs);
    if (!places.some((place) => place !== null)) return null;
    const today = todayInColombia(now);
    // Un viaje que ya terminó no necesita clima.
    if (trip.endDate < today) return null;
    const startsIn = dayCount(today, trip.startDate) - 1;
    if (startsIn <= FORECAST_DAYS) {
      const days = await forecast(trip, places, today, fetcher, now.getTime());
      if (days.length) return { mode: 'forecast', days };
    }
    const months = await typical(trip, places, fetcher, now.getTime());
    return months.length ? { mode: 'typical', months } : null;
  } catch (error) {
    console.warn('[mi-viaje] clima no disponible:', error instanceof Error ? error.message : error);
    return null;
  }
}
