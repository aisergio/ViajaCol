import {
  type CatalogKind,
  TRIP_LIMITS,
  type Trip,
  TripError,
  type TripErrorCode,
  addCatalogItem,
  dayDate,
  newTrip,
  tripDetailsSchema,
} from '@/domain/trip';
import { ConflictError, type TripsRepository } from './ports';

/** Identidad mínima; sale siempre de la sesión. */
export interface TripOwner {
  sub: string;
}

/** Dependencias que no son puras: identificadores aleatorios y reloj (inyectables en las pruebas). */
export interface TripDeps {
  newId: () => string;
  now: () => Date;
}

export type TripResultError = TripErrorCode | 'conflicto';
export type TripResult = { ok: true; trip: Trip } | { ok: false; error: TripResultError };

/** Busca el nombre de una ficha del catálogo; `null` si el slug no existe. */
export type CatalogLookup = (kind: CatalogKind, slug: string) => string | null;

const fail = (error: TripResultError): TripResult => ({ ok: false, error });

export async function listTrips(repo: TripsRepository, owner: TripOwner): Promise<Trip[]> {
  const trips = await repo.list(owner.sub);
  return trips.sort(
    (a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name),
  );
}

export async function getTrip(
  repo: TripsRepository,
  owner: TripOwner,
  tripId: string,
): Promise<Trip | null> {
  return repo.get(owner.sub, tripId);
}

export async function createTrip(
  repo: TripsRepository,
  owner: TripOwner,
  rawDetails: unknown,
  deps: TripDeps,
): Promise<TripResult> {
  const details = tripDetailsSchema.safeParse(rawDetails);
  if (!details.success) return fail('invalido');
  const existing = await repo.list(owner.sub);
  if (existing.length >= TRIP_LIMITS.trips) return fail('limite');
  const trip = newTrip({
    sub: owner.sub,
    tripId: deps.newId(),
    details: details.data,
    now: deps.now(),
  });
  await repo.create(trip);
  return { ok: true, trip };
}

/**
 * Carga el viaje del usuario, aplica un cambio puro y lo guarda con control de versión.
 * - Con `expectedVersion`, la versión debe coincidir con la que vio el cliente (si no, `conflicto`).
 * - Con `'latest'` (agregar desde el catálogo) se usa la última y se reintenta una vez si alguien
 *   guardó en medio.
 */
export async function mutateTrip(
  repo: TripsRepository,
  owner: TripOwner,
  tripId: string,
  expectedVersion: number | 'latest',
  change: (trip: Trip) => Trip,
  attempts = expectedVersion === 'latest' ? 2 : 1,
): Promise<TripResult> {
  const trip = await repo.get(owner.sub, tripId);
  if (!trip) return fail('no-encontrado');
  if (expectedVersion !== 'latest' && trip.version !== expectedVersion) return fail('conflicto');
  let next: Trip;
  try {
    next = change(trip);
  } catch (error) {
    if (error instanceof TripError) return fail(error.code);
    throw error;
  }
  try {
    return { ok: true, trip: await repo.save(next, trip.version) };
  } catch (error) {
    if (!(error instanceof ConflictError)) throw error;
    if (attempts > 1) return mutateTrip(repo, owner, tripId, expectedVersion, change, attempts - 1);
    return fail('conflicto');
  }
}

export async function deleteTrip(
  repo: TripsRepository,
  owner: TripOwner,
  tripId: string,
): Promise<boolean> {
  const trip = await repo.get(owner.sub, tripId);
  if (!trip) return false;
  await repo.delete(owner.sub, tripId);
  return true;
}

/** «Agregar a Mi viaje» desde una ficha: el nombre sale del catálogo, nunca del navegador. */
export async function addFromCatalog(
  repo: TripsRepository,
  owner: TripOwner,
  tripId: string,
  kind: CatalogKind,
  slug: string,
  lookup: CatalogLookup,
  deps: TripDeps,
): Promise<TripResult> {
  const title = lookup(kind, slug);
  if (!title) return fail('invalido');
  return mutateTrip(repo, owner, tripId, 'latest', (trip) =>
    addCatalogItem(trip, { id: deps.newId(), kind, slug, title }, deps.now()),
  );
}

/** Fecha de hoy en Colombia (`AAAA-MM-DD`). */
export function todayInColombia(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(now);
}

/**
 * Convierte el borrador local en un viaje (research D-05). El viaje usa el `migrationId` como
 * `tripId`, así que dos pestañas que migran a la vez no duplican: la segunda encuentra el viaje. Los
 * elementos que no existen en el catálogo se omiten.
 */
export async function migrateDraft(
  repo: TripsRepository,
  owner: TripOwner,
  migrationId: string,
  draft: readonly { kind: CatalogKind; slug: string }[],
  name: string,
  lookup: CatalogLookup,
  deps: TripDeps,
): Promise<TripResult | { ok: true; trip: null }> {
  const already = await repo.get(owner.sub, migrationId);
  if (already) return { ok: true, trip: already };
  const valid = draft
    .filter((entry) => lookup(entry.kind, entry.slug) !== null)
    .slice(0, TRIP_LIMITS.items);
  if (!valid.length) return { ok: true, trip: null };
  const trips = await repo.list(owner.sub);
  if (trips.length >= TRIP_LIMITS.trips) return fail('limite');

  const now = deps.now();
  const start = todayInColombia(now);
  let trip: Trip = {
    ...newTrip({
      sub: owner.sub,
      tripId: migrationId,
      details: { name, startDate: start, endDate: dayDate(start, 2), travelers: 1, budget: 0 },
      now,
    }),
    migrationId,
  };
  for (const entry of valid) {
    try {
      trip = addCatalogItem(
        trip,
        { id: deps.newId(), ...entry, title: lookup(entry.kind, entry.slug) as string },
        now,
      );
    } catch (error) {
      if (!(error instanceof TripError && error.code === 'duplicado')) throw error;
    }
  }
  try {
    await repo.create(trip);
  } catch (error) {
    if (!(error instanceof ConflictError)) throw error;
    const created = await repo.get(owner.sub, migrationId);
    if (created) return { ok: true, trip: created };
    throw error;
  }
  return { ok: true, trip };
}
