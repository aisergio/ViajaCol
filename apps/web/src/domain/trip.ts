import { z } from 'zod';

/** Límites del viaje (spec 007, Assumptions). */
export const TRIP_LIMITS = {
  trips: 20,
  items: 100,
  days: 30,
  travelers: 20,
  money: 100_000_000,
  name: 60,
  title: 80,
  text: 500,
} as const;

export const CATALOG_KINDS = ['sitio', 'fiesta', 'plato', 'experiencia'] as const;
export const ITEM_KINDS = [...CATALOG_KINDS, 'nota'] as const;
export type CatalogKind = (typeof CATALOG_KINDS)[number];
export type ItemKind = (typeof ITEM_KINDS)[number];

/** Llave de una ficha del catálogo en los mapas de referencias: `sitio:valle-de-cocora`. */
export function catalogKey(kind: CatalogKind, slug: string): string {
  return `${kind}:${slug}`;
}

/**
 * Lo que la interfaz necesita de una ficha: nombre en el idioma de la página, enlace, lugar y
 * coordenadas. `null` en el mapa significa que la ficha ya no existe (se muestra «no disponible»).
 */
export interface CatalogRef {
  name: string;
  href: string;
  place: string | null;
  coords: readonly [number, number] | null;
}

/** Fiesta del catálogo que cae en las fechas del viaje (US7, escenario 2). */
export interface FestivalSuggestion {
  slug: string;
  name: string;
  /** Cuándo ocurre, en palabras del catálogo («Primera semana de agosto»). */
  when: string;
  ref: CatalogRef;
}

export interface TripItem {
  id: string;
  kind: ItemKind;
  /** Slug de la ficha del catálogo; `null` en las notas. */
  slug: string | null;
  title: string;
  /** Texto de la nota; `null` en las fichas. */
  text: string | null;
  /** Índice del día (0 = primer día) o `null` para «Sin día». */
  day: number | null;
  order: number;
  cost: number | null;
}

export interface Trip {
  sub: string;
  tripId: string;
  name: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number;
  items: TripItem[];
  version: number;
  shareId: string | null;
  migrationId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * El viaje tal como lo ve su dueño en el navegador: sin el `sub` ni la marca de migración. Las
 * operaciones de abajo aceptan cualquier objeto con esta forma, así que el servidor las aplica a `Trip`
 * y el ViewModel del editor las aplica a su estado optimista (research D-03).
 */
export type TripView = Omit<Trip, 'sub' | 'migrationId'>;

export function toTripView(trip: Trip): TripView {
  return {
    tripId: trip.tripId,
    name: trip.name,
    startDate: trip.startDate,
    endDate: trip.endDate,
    travelers: trip.travelers,
    budget: trip.budget,
    items: trip.items,
    version: trip.version,
    shareId: trip.shareId,
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
  };
}

export type TripErrorCode = 'invalido' | 'limite' | 'duplicado' | 'no-encontrado';

export class TripError extends Error {
  constructor(readonly code: TripErrorCode) {
    super(code);
    this.name = 'TripError';
  }
}

const DAY_MS = 86_400_000;
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && toIso(fromIso(value)) === value,
  );

/** Número de días entre dos fechas `AAAA-MM-DD`, ambas incluidas. */
export function dayCount(startDate: string, endDate: string): number {
  return Math.round((fromIso(endDate) - fromIso(startDate)) / DAY_MS) + 1;
}

/** Fecha `AAAA-MM-DD` del día `day` del viaje. */
export function dayDate(startDate: string, day: number): string {
  return toIso(fromIso(startDate) + day * DAY_MS);
}

function fromIso(value: string): number {
  return Date.parse(`${value}T00:00:00Z`);
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export const tripDetailsSchema = z
  .object({
    name: z.string().trim().min(1).max(TRIP_LIMITS.name),
    startDate: isoDate,
    endDate: isoDate,
    travelers: z.coerce.number().int().min(1).max(TRIP_LIMITS.travelers),
    budget: z.coerce.number().int().min(0).max(TRIP_LIMITS.money),
  })
  // Las reglas entre fechas solo se revisan si las dos fechas son válidas: Zod también corre los
  // refinamientos del objeto cuando un campo falló, y el error iría al campo equivocado.
  .refine((d) => !validDates(d) || d.endDate >= d.startDate, {
    path: ['endDate'],
    message: 'fin-antes-de-inicio',
  })
  .refine((d) => !validDates(d) || dayCount(d.startDate, d.endDate) <= TRIP_LIMITS.days, {
    path: ['endDate'],
    message: 'demasiado-largo',
  });

function validDates(details: { startDate: unknown; endDate: unknown }): boolean {
  return isoDate.safeParse(details.startDate).success && isoDate.safeParse(details.endDate).success;
}

export type TripDetails = z.infer<typeof tripDetailsSchema>;
export type TripField = keyof TripDetails;
export const TRIP_FIELDS = [
  'name',
  'startDate',
  'endDate',
  'travelers',
  'budget',
] as const satisfies readonly TripField[];
/** Código del error de un campo: el propio campo (valor fuera de rango) o una regla entre fechas. */
export type TripFieldError = TripField | 'fin-antes-de-inicio' | 'demasiado-largo';

/**
 * Errores del formulario del viaje por campo, o `null` si los datos son válidos (US1, escenario 3: el
 * error va junto al campo). Se queda con el primer error de cada campo.
 */
export function detailsFieldErrors(
  raw: unknown,
): Partial<Record<TripField, TripFieldError>> | null {
  const parsed = tripDetailsSchema.safeParse(raw);
  if (parsed.success) return null;
  const errors: Partial<Record<TripField, TripFieldError>> = {};
  for (const issue of parsed.error.issues) {
    const field = TRIP_FIELDS.find((candidate) => candidate === issue.path[0]);
    if (!field || errors[field]) continue;
    errors[field] =
      issue.message === 'fin-antes-de-inicio' || issue.message === 'demasiado-largo'
        ? issue.message
        : field;
  }
  return errors;
}

export const noteSchema = z.object({
  title: z.string().trim().min(1).max(TRIP_LIMITS.title),
  text: z.string().trim().max(TRIP_LIMITS.text),
});

export const costSchema = z.coerce.number().int().min(0).max(TRIP_LIMITS.money).nullable();

/** Viaje nuevo, sin elementos, en la versión 1. */
export function newTrip(params: {
  sub: string;
  tripId: string;
  details: TripDetails;
  now: Date;
}): Trip {
  const stamp = params.now.toISOString();
  return {
    sub: params.sub,
    tripId: params.tripId,
    ...params.details,
    items: [],
    version: 1,
    shareId: null,
    migrationId: null,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/** Elementos agrupados por día en su orden; `null` es «Sin día». */
export function groupByDay(items: readonly TripItem[]): Map<number | null, TripItem[]> {
  const groups = new Map<number | null, TripItem[]>();
  for (const item of [...items].sort((a, b) => a.order - b.order)) {
    const list = groups.get(item.day) ?? [];
    list.push(item);
    groups.set(item.day, list);
  }
  return groups;
}

/** Vuelve a numerar el orden de cada día desde 0, conservando el orden relativo. */
function renumber(items: readonly TripItem[]): TripItem[] {
  return [...groupByDay(items).values()].flatMap((list) =>
    list.map((item, index) => ({ ...item, order: index })),
  );
}

function touch<T extends TripView>(
  trip: T,
  items: TripItem[],
  now: Date,
  extra: Partial<TripView> = {},
): T {
  return { ...trip, ...extra, items, updatedAt: now.toISOString() };
}

function findItem(trip: TripView, itemId: string): TripItem {
  const item = trip.items.find((candidate) => candidate.id === itemId);
  if (!item) throw new TripError('no-encontrado');
  return item;
}

/** Cambia los datos del viaje; los elementos de días que ya no existen pasan a «Sin día». */
export function applyDetails<T extends TripView>(trip: T, details: TripDetails, now: Date): T {
  const days = dayCount(details.startDate, details.endDate);
  const unassigned = [...(groupByDay(trip.items).get(null) ?? [])].length;
  let next = 0;
  const items = trip.items
    .slice()
    .sort((a, b) => (a.day ?? -1) - (b.day ?? -1) || a.order - b.order)
    .map((item) =>
      item.day !== null && item.day >= days
        ? { ...item, day: null, order: unassigned + next++ }
        : item,
    );
  return touch(trip, renumber(items), now, details);
}

/** Agrega una ficha del catálogo a «Sin día». Una ficha aparece una sola vez por viaje. */
export function addCatalogItem<T extends TripView>(
  trip: T,
  entry: { id: string; kind: CatalogKind; slug: string; title: string },
  now: Date,
): T {
  if (trip.items.some((item) => item.kind === entry.kind && item.slug === entry.slug)) {
    throw new TripError('duplicado');
  }
  if (trip.items.length >= TRIP_LIMITS.items) throw new TripError('limite');
  const order = groupByDay(trip.items).get(null)?.length ?? 0;
  const item: TripItem = { ...entry, text: null, day: null, order, cost: null };
  return touch(trip, [...trip.items, item], now);
}

/** Crea o cambia una nota libre en un día (o en «Sin día»). */
export function upsertNote<T extends TripView>(
  trip: T,
  note: { id: string; title: string; text: string; day: number | null },
  now: Date,
): T {
  const parsed = noteSchema.safeParse(note);
  if (!parsed.success) throw new TripError('invalido');
  assertDay(trip, note.day);
  const existing = trip.items.find((item) => item.id === note.id);
  if (existing && existing.kind !== 'nota') throw new TripError('invalido');
  if (existing) {
    const updated = { ...existing, title: parsed.data.title, text: parsed.data.text || null };
    const moved =
      existing.day === note.day
        ? updated
        : { ...updated, day: note.day, order: Number.MAX_SAFE_INTEGER };
    return touch(
      trip,
      renumber(trip.items.map((item) => (item.id === note.id ? moved : item))),
      now,
    );
  }
  if (trip.items.length >= TRIP_LIMITS.items) throw new TripError('limite');
  const order = groupByDay(trip.items).get(note.day)?.length ?? 0;
  const item: TripItem = {
    id: note.id,
    kind: 'nota',
    slug: null,
    title: parsed.data.title,
    text: parsed.data.text || null,
    day: note.day,
    order,
    cost: null,
  };
  return touch(trip, [...trip.items, item], now);
}

function assertDay(trip: TripView, day: number | null) {
  if (day === null) return;
  if (!Number.isInteger(day) || day < 0 || day >= dayCount(trip.startDate, trip.endDate)) {
    throw new TripError('invalido');
  }
}

/** Mueve un elemento a la posición `index` del día `day` (o de «Sin día»). */
export function moveItem<T extends TripView>(
  trip: T,
  itemId: string,
  day: number | null,
  index: number,
  now: Date,
): T {
  const item = findItem(trip, itemId);
  assertDay(trip, day);
  const groups = groupByDay(trip.items.filter((candidate) => candidate.id !== itemId));
  const target = groups.get(day) ?? [];
  const at = Math.max(0, Math.min(Math.trunc(index), target.length));
  target.splice(at, 0, { ...item, day });
  groups.set(day, target);
  const items = [...groups.values()].flatMap((list) =>
    list.map((entry, order) => ({ ...entry, order })),
  );
  return touch(trip, items, now);
}

export function removeItem<T extends TripView>(trip: T, itemId: string, now: Date): T {
  findItem(trip, itemId);
  return touch(trip, renumber(trip.items.filter((item) => item.id !== itemId)), now);
}

export function setItemCost<T extends TripView>(
  trip: T,
  itemId: string,
  cost: number | null,
  now: Date,
): T {
  findItem(trip, itemId);
  const parsed = costSchema.safeParse(cost);
  if (!parsed.success) throw new TripError('invalido');
  return touch(
    trip,
    trip.items.map((item) => (item.id === itemId ? { ...item, cost: parsed.data } : item)),
    now,
  );
}

export function shareTrip<T extends TripView>(trip: T, shareId: string, now: Date): T {
  return touch(trip, trip.items, now, { shareId });
}

export function unshareTrip<T extends TripView>(trip: T, now: Date): T {
  return touch(trip, trip.items, now, { shareId: null });
}

export interface BudgetTotals {
  byKind: Record<ItemKind, number>;
  total: number;
  remaining: number;
  over: boolean;
}

/** Totales del presupuesto (estado derivado: no se guardan). */
export function budgetTotals(
  items: readonly Pick<TripItem, 'kind' | 'cost'>[],
  budget: number,
): BudgetTotals {
  const byKind = Object.fromEntries(ITEM_KINDS.map((kind) => [kind, 0])) as Record<
    ItemKind,
    number
  >;
  for (const item of items) byKind[item.kind] += item.cost ?? 0;
  const total = Object.values(byKind).reduce((sum, value) => sum + value, 0);
  return { byKind, total, remaining: budget - total, over: total > budget };
}
