'use server';

import { randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  CATALOG_KINDS,
  TRIP_FIELDS,
  type Trip,
  type TripField,
  type TripFieldError,
  type TripView,
  costSchema,
  detailsFieldErrors,
  moveItem,
  removeItem,
  setItemCost,
  shareTrip,
  tripDetailsSchema,
  unshareTrip,
  upsertNote,
  applyDetails,
  toTripView,
} from '@/domain/trip';
import { redirect } from '@/i18n/navigation';
import { getAccountServices } from '@/server/account-services';
import {
  type TripDeps,
  type TripResultError,
  addFromCatalog,
  createTrip,
  deleteTrip,
  listTrips,
  migrateDraft,
  mutateTrip,
} from '@/server/application/trips/use-cases';
import { getSessionUser } from '@/server/auth/session';
import { catalogTitle } from '@/server/trips/catalog';

export type { TripView };
export type TripActionError = TripResultError | 'sin-sesion' | 'no-disponible';
export type TripActionResult = { ok: true; trip: TripView } | { ok: false; error: TripActionError };

const deps: TripDeps = { newId: () => randomUUID(), now: () => new Date() };
const id = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9-]+$/);
const version = z.number().int().min(1);
const day = z.number().int().min(0).max(29).nullable();
const locale = z.enum(['es', 'en']);

/** Sesión + servicios; cualquier error de infraestructura se reporta como `no-disponible`. */
async function run(
  work: (
    owner: { sub: string },
    services: Awaited<ReturnType<typeof getAccountServices>>,
  ) => Promise<TripActionResult>,
): Promise<TripActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: 'sin-sesion' };
  try {
    return await work({ sub: user.sub }, await getAccountServices());
  } catch (error) {
    console.error('[mi-viaje] acción falló:', error instanceof Error ? error.message : error);
    return { ok: false, error: 'no-disponible' };
  }
}

async function result(
  promise: Promise<{ ok: true; trip: Trip } | { ok: false; error: TripResultError }>,
) {
  const value = await promise;
  return value.ok ? ({ ok: true, trip: toTripView(value.trip) } as const) : value;
}

/** Los campos del formulario tal como llegaron (texto acotado), para devolverlos si hay errores. */
function values(formData: FormData): TripFormValues {
  return Object.fromEntries(
    TRIP_FIELDS.map((field) => {
      const value = formData.get(field);
      return [field, typeof value === 'string' ? value.slice(0, 100) : ''];
    }),
  ) as TripFormValues;
}

// --- Viajes -----------------------------------------------------------------------------------------

export type TripFormValues = Record<TripField, string>;
export type TripFormState =
  | { status: 'idle' }
  | {
      status: 'error';
      error: TripActionError;
      /** Error de cada campo, para mostrarlo junto a él (US1, escenario 3). */
      fields?: Partial<Record<TripField, TripFieldError>>;
      /** Lo que escribió el usuario: el formulario lo conserva tras el error. */
      values?: TripFormValues;
    }
  | { status: 'ok'; trip: TripView };

function invalid(formData: FormData): TripFormState | null {
  const fields = detailsFieldErrors(values(formData));
  return fields ? { status: 'error', error: 'invalido', fields, values: values(formData) } : null;
}

/** Crea un viaje (US1) y abre su página. */
export async function crearViaje(
  language: string,
  _prev: TripFormState,
  formData: FormData,
): Promise<TripFormState> {
  const rejected = invalid(formData);
  if (rejected) return rejected;
  const outcome = await run((owner, { trips }) =>
    result(createTrip(trips, owner, values(formData), deps)),
  );
  if (!outcome.ok) return { status: 'error', error: outcome.error, values: values(formData) };
  redirect({
    href: `/mi-viaje/${outcome.trip.tripId}`,
    locale: locale.catch('es').parse(language),
  });
  return { status: 'ok', trip: outcome.trip };
}

/** Cambia los datos del viaje (US1); los elementos de los días que desaparecen pasan a «Sin día». */
export async function editarViaje(
  tripId: string,
  expected: number,
  _prev: TripFormState,
  formData: FormData,
): Promise<TripFormState> {
  if (!id.safeParse(tripId).success || !version.safeParse(expected).success)
    return { status: 'error', error: 'invalido' };
  const rejected = invalid(formData);
  if (rejected) return rejected;
  const parsed = tripDetailsSchema.parse(values(formData));
  const outcome = await run((owner, { trips }) =>
    result(
      mutateTrip(trips, owner, tripId, expected, (trip) => applyDetails(trip, parsed, deps.now())),
    ),
  );
  return outcome.ok
    ? { status: 'ok', trip: outcome.trip }
    : { status: 'error', error: outcome.error, values: values(formData) };
}

export async function eliminarViaje(
  language: string,
  tripId: string,
  _prev: TripFormState,
  formData: FormData,
): Promise<TripFormState> {
  if (formData.get('confirmar') !== 'eliminar' || !id.safeParse(tripId).success)
    return { status: 'error', error: 'invalido' };
  const user = await getSessionUser();
  if (!user) return { status: 'error', error: 'sin-sesion' };
  try {
    const { trips } = await getAccountServices();
    if (!(await deleteTrip(trips, { sub: user.sub }, tripId)))
      return { status: 'error', error: 'no-encontrado' };
  } catch {
    return { status: 'error', error: 'no-disponible' };
  }
  redirect({ href: '/mi-viaje', locale: locale.catch('es').parse(language) });
  return { status: 'idle' };
}

// --- Elementos (el cliente envía la versión que vio) ------------------------------------------------

export async function moverElemento(
  tripId: string,
  expected: number,
  itemId: string,
  toDay: number | null,
  index: number,
) {
  if (
    ![
      id.safeParse(tripId),
      version.safeParse(expected),
      id.safeParse(itemId),
      day.safeParse(toDay),
      z.number().int().min(0).safeParse(index),
    ].every((r) => r.success)
  ) {
    return { ok: false, error: 'invalido' } satisfies TripActionResult;
  }
  return run((owner, { trips }) =>
    result(
      mutateTrip(trips, owner, tripId, expected, (trip) =>
        moveItem(trip, itemId, toDay, index, deps.now()),
      ),
    ),
  );
}

export async function quitarElemento(tripId: string, expected: number, itemId: string) {
  if (
    ![id.safeParse(tripId), version.safeParse(expected), id.safeParse(itemId)].every(
      (r) => r.success,
    )
  ) {
    return { ok: false, error: 'invalido' } satisfies TripActionResult;
  }
  return run((owner, { trips }) =>
    result(
      mutateTrip(trips, owner, tripId, expected, (trip) => removeItem(trip, itemId, deps.now())),
    ),
  );
}

export async function ponerCosto(
  tripId: string,
  expected: number,
  itemId: string,
  cost: number | null,
) {
  if (
    ![
      id.safeParse(tripId),
      version.safeParse(expected),
      id.safeParse(itemId),
      costSchema.safeParse(cost),
    ].every((r) => r.success)
  ) {
    return { ok: false, error: 'invalido' } satisfies TripActionResult;
  }
  return run((owner, { trips }) =>
    result(
      mutateTrip(trips, owner, tripId, expected, (trip) =>
        setItemCost(trip, itemId, cost, deps.now()),
      ),
    ),
  );
}

const noteInput = z.object({ id: id.optional(), title: z.string(), text: z.string(), day });

export async function guardarNota(
  tripId: string,
  expected: number,
  note: z.infer<typeof noteInput>,
) {
  const parsed = noteInput.safeParse(note);
  if (!parsed.success || !id.safeParse(tripId).success || !version.safeParse(expected).success) {
    return { ok: false, error: 'invalido' } satisfies TripActionResult;
  }
  const noteId = parsed.data.id ?? deps.newId();
  return run((owner, { trips }) =>
    result(
      mutateTrip(trips, owner, tripId, expected, (trip) =>
        upsertNote(trip, { ...parsed.data, id: noteId }, deps.now()),
      ),
    ),
  );
}

// --- Compartir (US6) ----------------------------------------------------------------------------------

export async function compartirViaje(tripId: string, expected: number) {
  if (!id.safeParse(tripId).success || !version.safeParse(expected).success)
    return { ok: false, error: 'invalido' } satisfies TripActionResult;
  const shareId = randomBytes(16).toString('base64url');
  return run((owner, { trips }) =>
    result(
      mutateTrip(trips, owner, tripId, expected, (trip) => shareTrip(trip, shareId, deps.now())),
    ),
  );
}

export async function dejarDeCompartir(tripId: string, expected: number) {
  if (!id.safeParse(tripId).success || !version.safeParse(expected).success)
    return { ok: false, error: 'invalido' } satisfies TripActionResult;
  return run((owner, { trips }) =>
    result(mutateTrip(trips, owner, tripId, expected, (trip) => unshareTrip(trip, deps.now()))),
  );
}

// --- Desde el catálogo (US2) y el borrador (US5) ------------------------------------------------------

export interface TripSummary {
  tripId: string;
  name: string;
  startDate: string;
  endDate: string;
  count: number;
}

export async function listarMisViajes(): Promise<
  { ok: true; trips: TripSummary[] } | { ok: false; error: TripActionError }
> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: 'sin-sesion' };
  try {
    const { trips } = await getAccountServices();
    const list = await listTrips(trips, { sub: user.sub });
    return {
      ok: true,
      trips: list.map((trip) => ({
        tripId: trip.tripId,
        name: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
        count: trip.items.length,
      })),
    };
  } catch {
    return { ok: false, error: 'no-disponible' };
  }
}

const catalogKind = z.enum(CATALOG_KINDS);
const slug = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export async function agregarAlViaje(
  language: string,
  tripId: string,
  kind: string,
  itemSlug: string,
) {
  const parsedKind = catalogKind.safeParse(kind);
  if (!parsedKind.success || !slug.safeParse(itemSlug).success || !id.safeParse(tripId).success) {
    return { ok: false, error: 'invalido' } satisfies TripActionResult;
  }
  const lang = locale.catch('es').parse(language);
  return run((owner, { trips }) =>
    result(
      addFromCatalog(
        trips,
        owner,
        tripId,
        parsedKind.data,
        itemSlug,
        (k, s) => catalogTitle(k, s, lang),
        deps,
      ),
    ),
  );
}

const draftInput = z.object({
  migrationId: z.string().uuid(),
  items: z.array(z.object({ kind: catalogKind, slug })).max(100),
});

/** Convierte el borrador local en un viaje de la cuenta (US5, idempotente). */
export async function migrarBorrador(
  language: string,
  input: z.infer<typeof draftInput>,
  name: string,
) {
  const parsed = draftInput.safeParse(input);
  const lang = locale.catch('es').parse(language);
  if (!parsed.success) return { ok: false, error: 'invalido' } as const;
  const user = await getSessionUser();
  if (!user) return { ok: false, error: 'sin-sesion' } as const;
  try {
    const { trips } = await getAccountServices();
    const outcome = await migrateDraft(
      trips,
      { sub: user.sub },
      parsed.data.migrationId,
      parsed.data.items,
      z.string().trim().min(1).max(60).catch('Mi borrador').parse(name),
      (k, s) => catalogTitle(k, s, lang),
      deps,
    );
    if (!outcome.ok) return outcome;
    return { ok: true, trip: outcome.trip ? toTripView(outcome.trip) : null } as const;
  } catch {
    return { ok: false, error: 'no-disponible' } as const;
  }
}
