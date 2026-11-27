import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Trip, newTrip } from '@/domain/trip';
import { createMemoryTripsRepository } from '@/server/application/trips/memory-repository';
import {
  agregarAlViaje,
  compartirViaje,
  crearViaje,
  dejarDeCompartir,
  editarViaje,
  eliminarViaje,
  guardarNota,
  listarMisViajes,
  migrarBorrador,
  moverElemento,
  ponerCosto,
  quitarElemento,
} from './actions';

const getSessionUser = vi.fn();
const redirect = vi.fn<(target: unknown) => never>(() => {
  throw new Error('NEXT_REDIRECT');
});
let repo = createMemoryTripsRepository();

vi.mock('@/server/auth/session', () => ({ getSessionUser: () => getSessionUser() }));
vi.mock('@/server/account-services', () => ({ getAccountServices: async () => ({ trips: repo }) }));
vi.mock('@/i18n/navigation', () => ({ redirect: (arg: unknown) => redirect(arg) }));

const ana = { sub: 'sub-ana', email: 'ana@example.com', name: 'Ana' };
const beto = { sub: 'sub-beto', email: 'beto@example.com', name: 'Beto' };
const now = new Date('2026-11-27T15:00:00.000Z');
const details = {
  name: 'Eje cafetero',
  startDate: '2026-12-20',
  endDate: '2026-12-22',
  travelers: 2,
  budget: 0,
};
const fields = {
  name: 'Eje cafetero',
  startDate: '2026-12-20',
  endDate: '2026-12-22',
  travelers: '2',
  budget: '0',
};
const IDLE = { status: 'idle' } as const;

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

/** Viaje de Ana con Monserrate en «Sin día», en la versión 1. */
function anaTrip(extra: Partial<Trip> = {}): Trip {
  const trip = newTrip({ sub: ana.sub, tripId: 'viaje-ana', details, now });
  return {
    ...trip,
    items: [
      {
        id: 'e1',
        kind: 'sitio',
        slug: 'monserrate',
        title: 'Cerro de Monserrate',
        text: null,
        day: null,
        order: 0,
        cost: null,
      },
    ],
    ...extra,
  };
}

beforeEach(() => {
  repo = createMemoryTripsRepository([anaTrip()]);
  getSessionUser.mockReset().mockResolvedValue(ana);
  redirect.mockClear();
});

describe('sesión y dueño (FR-002, FR-016, SC-002)', () => {
  it('sin sesión ninguna acción cambia nada', async () => {
    getSessionUser.mockResolvedValue(null);
    expect(await moverElemento('viaje-ana', 1, 'e1', 0, 0)).toEqual({
      ok: false,
      error: 'sin-sesion',
    });
    expect(await crearViaje('es', IDLE, form(fields))).toEqual({
      status: 'error',
      error: 'sin-sesion',
      values: fields,
    });
    expect(await listarMisViajes()).toEqual({ ok: false, error: 'sin-sesion' });
    expect(
      await migrarBorrador('es', { migrationId: crypto.randomUUID(), items: [] }, 'X'),
    ).toEqual({ ok: false, error: 'sin-sesion' });
    expect((await repo.get(ana.sub, 'viaje-ana'))?.version).toBe(1);
  });

  it('el viaje de otra persona responde como si no existiera y no cambia', async () => {
    getSessionUser.mockResolvedValue(beto);
    expect(await moverElemento('viaje-ana', 1, 'e1', 0, 0)).toEqual({
      ok: false,
      error: 'no-encontrado',
    });
    expect(await compartirViaje('viaje-ana', 1)).toEqual({ ok: false, error: 'no-encontrado' });
    expect(await agregarAlViaje('es', 'viaje-ana', 'plato', 'bandeja-paisa')).toEqual({
      ok: false,
      error: 'no-encontrado',
    });
    expect(await eliminarViaje('es', 'viaje-ana', IDLE, form({ confirmar: 'eliminar' }))).toEqual({
      status: 'error',
      error: 'no-encontrado',
    });
    expect(await repo.get(ana.sub, 'viaje-ana')).toMatchObject({ version: 1, shareId: null });
  });

  it('la respuesta nunca trae el sub ni la marca de migración', async () => {
    const result = await moverElemento('viaje-ana', 1, 'e1', 0, 0);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.trip).not.toHaveProperty('sub');
      expect(result.trip).not.toHaveProperty('migrationId');
    }
  });
});

describe('validación de la entrada', () => {
  it.each([
    ['un id con símbolos', () => moverElemento('../otro', 1, 'e1', 0, 0)],
    ['una versión que no es entera', () => quitarElemento('viaje-ana', 1.5, 'e1')],
    ['un día fuera de rango', () => moverElemento('viaje-ana', 1, 'e1', 30, 0)],
    ['un costo negativo', () => ponerCosto('viaje-ana', 1, 'e1', -1)],
    [
      'una nota sin día válido',
      () => guardarNota('viaje-ana', 1, { title: 'x', text: '', day: -1 }),
    ],
    ['un tipo de ficha desconocido', () => agregarAlViaje('es', 'viaje-ana', 'hotel', 'x')],
    [
      'una ficha que no existe en el catálogo',
      () => agregarAlViaje('es', 'viaje-ana', 'plato', 'no-existe'),
    ],
  ])('rechaza %s', async (_label, call) => {
    expect(await call()).toEqual({ ok: false, error: 'invalido' });
  });
});

describe('crear, editar y eliminar (US1)', () => {
  it('crea el viaje del usuario de la sesión y abre su página', async () => {
    await expect(crearViaje('en', IDLE, form({ ...fields, sub: 'sub-beto' }))).rejects.toThrow(
      'NEXT_REDIRECT',
    );
    const [created] = (await repo.list(ana.sub)).filter((trip) => trip.tripId !== 'viaje-ana');
    expect(created).toMatchObject({ name: 'Eje cafetero', travelers: 2, version: 1 });
    expect(await repo.list(beto.sub)).toEqual([]);
    expect(redirect).toHaveBeenCalledWith({ href: `/mi-viaje/${created?.tripId}`, locale: 'en' });
  });

  it('con datos inválidos devuelve el error de cada campo y lo escrito (escenario 3)', async () => {
    const values = { ...fields, endDate: '2026-12-19' };
    expect(await crearViaje('es', IDLE, form(values))).toEqual({
      status: 'error',
      error: 'invalido',
      fields: { endDate: 'fin-antes-de-inicio' },
      values,
    });
    expect(await repo.list(ana.sub)).toHaveLength(1);
  });

  it('editar con la versión vieja da conflicto; con la actual acorta el viaje sin perder elementos', async () => {
    await moverElemento('viaje-ana', 1, 'e1', 2, 0);
    expect(await editarViaje('viaje-ana', 1, IDLE, form(fields))).toMatchObject({
      status: 'error',
      error: 'conflicto',
    });
    const result = await editarViaje(
      'viaje-ana',
      2,
      IDLE,
      form({ ...fields, endDate: '2026-12-21' }),
    );
    expect(result).toMatchObject({ status: 'ok', trip: { endDate: '2026-12-21', version: 3 } });
    expect((await repo.get(ana.sub, 'viaje-ana'))?.items[0]?.day).toBeNull();
  });

  it('eliminar exige escribir «eliminar» y luego vuelve a la lista', async () => {
    expect(await eliminarViaje('es', 'viaje-ana', IDLE, form({ confirmar: 'borrar' }))).toEqual({
      status: 'error',
      error: 'invalido',
    });
    await expect(
      eliminarViaje('es', 'viaje-ana', IDLE, form({ confirmar: 'eliminar' })),
    ).rejects.toThrow('NEXT_REDIRECT');
    expect(await repo.get(ana.sub, 'viaje-ana')).toBeNull();
    expect(redirect).toHaveBeenCalledWith({ href: '/mi-viaje', locale: 'es' });
  });
});

describe('elementos y concurrencia (US2, US3, US4)', () => {
  it('agregar pone el nombre del catálogo, no el del navegador, y evita duplicados', async () => {
    const result = await agregarAlViaje('en', 'viaje-ana', 'fiesta', 'feria-de-manizales');
    expect(result.ok && result.trip.items.at(-1)).toMatchObject({
      kind: 'fiesta',
      title: 'Manizales Fair',
      day: null,
    });
    expect(await agregarAlViaje('es', 'viaje-ana', 'sitio', 'monserrate')).toEqual({
      ok: false,
      error: 'duplicado',
    });
  });

  it('dos pestañas sobre la misma versión: la segunda recibe conflicto (SC-003)', async () => {
    expect((await moverElemento('viaje-ana', 1, 'e1', 0, 0)).ok).toBe(true);
    expect(await ponerCosto('viaje-ana', 1, 'e1', 5000)).toEqual({ ok: false, error: 'conflicto' });
    expect(await ponerCosto('viaje-ana', 2, 'e1', 5000)).toMatchObject({
      ok: true,
      trip: { version: 3 },
    });
  });

  it('una nota nueva usa el identificador del navegador y se puede editar', async () => {
    const id = crypto.randomUUID();
    const created = await guardarNota('viaje-ana', 1, {
      id,
      title: 'Vuelo',
      text: 'Sale 7:10',
      day: 0,
    });
    expect(created.ok && created.trip.items.find((item) => item.id === id)).toMatchObject({
      kind: 'nota',
      day: 0,
    });
    const edited = await guardarNota('viaje-ana', 2, {
      id,
      title: 'Vuelo AV9',
      text: '',
      day: null,
    });
    expect(edited.ok && edited.trip.items.find((item) => item.id === id)).toMatchObject({
      title: 'Vuelo AV9',
      text: null,
      day: null,
    });
  });
});

describe('compartir (US6)', () => {
  it('crea un identificador aleatorio de 128 bits y lo revoca', async () => {
    const shared = await compartirViaje('viaje-ana', 1);
    const shareId = shared.ok ? shared.trip.shareId : null;
    expect(shareId).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect((await repo.getByShareId(shareId as string))?.tripId).toBe('viaje-ana');
    const revoked = await dejarDeCompartir('viaje-ana', 2);
    expect(revoked.ok && revoked.trip.shareId).toBeNull();
    expect(await repo.getByShareId(shareId as string)).toBeNull();
  });
});

describe('desde el catálogo y el borrador (US2, US5)', () => {
  it('lista los viajes del usuario con cuántos elementos tienen', async () => {
    expect(await listarMisViajes()).toEqual({
      ok: true,
      trips: [
        {
          tripId: 'viaje-ana',
          name: 'Eje cafetero',
          startDate: '2026-12-20',
          endDate: '2026-12-22',
          count: 1,
        },
      ],
    });
  });

  it('migra el borrador una sola vez aunque se intente dos veces (idempotente)', async () => {
    const migrationId = crypto.randomUUID();
    const items = [
      { kind: 'sitio' as const, slug: 'monserrate' },
      { kind: 'plato' as const, slug: 'bandeja-paisa' },
      { kind: 'sitio' as const, slug: 'no-existe' },
    ];
    const first = await migrarBorrador('es', { migrationId, items }, 'Mi borrador');
    const second = await migrarBorrador('es', { migrationId, items }, 'Mi borrador');
    expect(first).toMatchObject({ ok: true, trip: { tripId: migrationId, name: 'Mi borrador' } });
    expect(second).toEqual(first);
    expect(first.ok && first.trip?.items.map((item) => item.title)).toEqual([
      'Cerro de Monserrate',
      'Bandeja paisa',
    ]);
    expect(await repo.list(ana.sub)).toHaveLength(2);
  });

  it('rechaza un borrador mal formado', async () => {
    expect(await migrarBorrador('es', { migrationId: 'no-uuid', items: [] }, 'X')).toEqual({
      ok: false,
      error: 'invalido',
    });
  });
});
