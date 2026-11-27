import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDraftStore } from '../model/draftStore';
import { type MigrationAction, useDraftMigrationViewModel } from './useDraftMigrationViewModel';

const refresh = vi.fn();
// Como en Next.js, el router es el mismo objeto en cada render.
const router = { refresh };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

beforeEach(() => {
  refresh.mockReset();
  useDraftStore.getState().clear();
});
afterEach(cleanup);

describe('useDraftMigrationViewModel (US5)', () => {
  it('con borrador, migra una sola vez con su identificador, lo vacía y recarga la lista', async () => {
    useDraftStore.getState().add({ kind: 'sitio', slug: 'monserrate', title: 'Monserrate' });
    useDraftStore.getState().add({ kind: 'plato', slug: 'bandeja-paisa', title: 'Bandeja' });
    const { migrationId } = useDraftStore.getState();
    const migrate = vi
      .fn<MigrationAction>()
      .mockResolvedValue({ ok: true, trip: { tripId: migrationId, name: 'Mi borrador' } });

    const { result, rerender } = renderHook(() =>
      useDraftMigrationViewModel('es', 'Mi borrador', migrate),
    );
    expect(result.current.status).toBe('migrating');
    await waitFor(() => expect(result.current.status).toBe('idle'));
    rerender();

    expect(migrate).toHaveBeenCalledTimes(1);
    expect(migrate).toHaveBeenCalledWith(
      'es',
      {
        migrationId,
        items: [
          { kind: 'sitio', slug: 'monserrate' },
          { kind: 'plato', slug: 'bandeja-paisa' },
        ],
      },
      'Mi borrador',
    );
    expect(useDraftStore.getState().items).toEqual([]);
    expect(useDraftStore.getState().migrationId).not.toBe(migrationId);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('con el borrador vacío no llama al servidor (escenario 3)', async () => {
    const migrate = vi.fn<MigrationAction>();
    const { result } = renderHook(() => useDraftMigrationViewModel('es', 'Mi borrador', migrate));
    await act(async () => undefined);
    expect(result.current.status).toBe('idle');
    expect(migrate).not.toHaveBeenCalled();
  });

  it('si falla, conserva el borrador para otro intento y lo dice', async () => {
    useDraftStore.getState().add({ kind: 'sitio', slug: 'monserrate', title: 'Monserrate' });
    const migrate = vi
      .fn<MigrationAction>()
      .mockResolvedValue({ ok: false, error: 'no-disponible' });
    const { result } = renderHook(() => useDraftMigrationViewModel('es', 'Mi borrador', migrate));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(useDraftStore.getState().items).toHaveLength(1);
    expect(refresh).not.toHaveBeenCalled();
  });
});
