import { describe, expect, it } from 'vitest';
import { TRIP_LIMITS, moveItem } from '@/domain/trip';
import { createMemoryTripsRepository } from './memory-repository';
import { ConflictError } from './ports';
import {
  addFromCatalog,
  createTrip,
  deleteTrip,
  getTrip,
  listTrips,
  migrateDraft,
  mutateTrip,
  todayInColombia,
} from './use-cases';

const ana = { sub: 'sub-ana' };
const beto = { sub: 'sub-beto' };
const details = {
  name: 'Eje cafetero',
  startDate: '2026-12-20',
  endDate: '2026-12-22',
  travelers: 2,
  budget: 1_500_000,
};
let counter = 0;
const deps = { newId: () => `id-${++counter}`, now: () => new Date('2026-11-27T15:00:00.000Z') };
const lookup = (kind: string, slug: string) => (slug === 'no-existe' ? null : `${kind}:${slug}`);

async function withTrip() {
  const repo = createMemoryTripsRepository();
  const created = await createTrip(repo, ana, details, deps);
  if (!created.ok) throw new Error('no se creó');
  return { repo, trip: created.trip };
}

describe('crear y listar', () => {
  it('crea en la versión 1 y lista solo los del dueño', async () => {
    const { repo, trip } = await withTrip();
    expect(trip.version).toBe(1);
    await createTrip(repo, beto, { ...details, name: 'Caribe' }, deps);
    expect((await listTrips(repo, ana)).map((t) => t.name)).toEqual(['Eje cafetero']);
  });

  it('rechaza datos inválidos y el viaje 21', async () => {
    const repo = createMemoryTripsRepository();
    expect(await createTrip(repo, ana, { ...details, endDate: '2026-12-01' }, deps)).toEqual({
      ok: false,
      error: 'invalido',
    });
    for (let i = 0; i < TRIP_LIMITS.trips; i++) await createTrip(repo, ana, details, deps);
    expect(await createTrip(repo, ana, details, deps)).toEqual({ ok: false, error: 'limite' });
  });
});

describe('dueño (SC-002)', () => {
  it('el viaje de otra persona no existe para el usuario', async () => {
    const { repo, trip } = await withTrip();
    expect(await getTrip(repo, beto, trip.tripId)).toBeNull();
    expect(await mutateTrip(repo, beto, trip.tripId, 1, (t) => t)).toEqual({
      ok: false,
      error: 'no-encontrado',
    });
    expect(await deleteTrip(repo, beto, trip.tripId)).toBe(false);
    expect(await getTrip(repo, ana, trip.tripId)).not.toBeNull();
  });
});

describe('concurrencia (SC-003)', () => {
  it('un cambio sobre una versión vieja es un conflicto y no pisa nada', async () => {
    const { repo, trip } = await withTrip();
    const added = await addFromCatalog(repo, ana, trip.tripId, 'sitio', 'cocora', lookup, deps);
    expect(added.ok && added.trip.version).toBe(2);
    const stale = await mutateTrip(repo, ana, trip.tripId, 1, (t) => ({ ...t, name: 'Pisado' }));
    expect(stale).toEqual({ ok: false, error: 'conflicto' });
    expect((await getTrip(repo, ana, trip.tripId))?.name).toBe('Eje cafetero');
  });

  it('agregar desde el catálogo reintenta una vez si alguien guardó en medio', async () => {
    const { repo, trip } = await withTrip();
    const realSave = repo.save.bind(repo);
    let failures = 1;
    repo.save = async (next, expected) => {
      if (failures-- > 0) throw new ConflictError();
      return realSave(next, expected);
    };
    const result = await addFromCatalog(
      repo,
      ana,
      trip.tripId,
      'fiesta',
      'feria-de-las-flores',
      lookup,
      deps,
    );
    expect(result.ok).toBe(true);
  });

  it('los errores del dominio llegan como resultado', async () => {
    const { repo, trip } = await withTrip();
    await addFromCatalog(repo, ana, trip.tripId, 'sitio', 'cocora', lookup, deps);
    expect(await addFromCatalog(repo, ana, trip.tripId, 'sitio', 'cocora', lookup, deps)).toEqual({
      ok: false,
      error: 'duplicado',
    });
    expect(
      await addFromCatalog(repo, ana, trip.tripId, 'sitio', 'no-existe', lookup, deps),
    ).toEqual({ ok: false, error: 'invalido' });
    const current = await getTrip(repo, ana, trip.tripId);
    const moved = await mutateTrip(repo, ana, trip.tripId, current!.version, (t) =>
      moveItem(t, 'nada', 0, 0, deps.now()),
    );
    expect(moved).toEqual({ ok: false, error: 'no-encontrado' });
  });
});

describe('migrateDraft', () => {
  const draft = [
    { kind: 'sitio' as const, slug: 'cocora' },
    { kind: 'plato' as const, slug: 'bandeja-paisa' },
    { kind: 'sitio' as const, slug: 'no-existe' },
  ];

  it('crea «Mi borrador» con los elementos válidos, desde hoy y por 3 días', async () => {
    const repo = createMemoryTripsRepository();
    const result = await migrateDraft(repo, ana, 'mig-1', draft, 'Mi borrador', lookup, deps);
    expect(result.ok && result.trip?.items.map((i) => i.slug)).toEqual(['cocora', 'bandeja-paisa']);
    expect(result.ok && result.trip).toMatchObject({
      tripId: 'mig-1',
      startDate: '2026-11-27',
      endDate: '2026-11-29',
    });
  });

  it('es idempotente y un borrador vacío no crea nada', async () => {
    const repo = createMemoryTripsRepository();
    await migrateDraft(repo, ana, 'mig-1', draft, 'Mi borrador', lookup, deps);
    await migrateDraft(repo, ana, 'mig-1', draft, 'Mi borrador', lookup, deps);
    expect(await listTrips(repo, ana)).toHaveLength(1);
    expect(await migrateDraft(repo, ana, 'mig-2', [], 'Mi borrador', lookup, deps)).toEqual({
      ok: true,
      trip: null,
    });
  });

  it('la fecha de hoy es la de Colombia', () => {
    expect(todayInColombia(new Date('2026-11-28T03:00:00.000Z'))).toBe('2026-11-27');
  });
});
