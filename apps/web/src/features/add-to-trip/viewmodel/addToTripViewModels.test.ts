import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDraftStore } from '@/features/trip-draft/model/draftStore';
import {
  type AddToTripDialogActions,
  useAddToTripDialogViewModel,
} from './useAddToTripDialogViewModel';
import { useAddToTripViewModel } from './useAddToTripViewModel';

const entry = { kind: 'sitio' as const, slug: 'monserrate', name: 'Cerro de Monserrate' };
const trips = [
  { tripId: 't1', name: 'Bogotá', startDate: '2026-12-01', endDate: '2026-12-02', count: 2 },
  { tripId: 't2', name: 'Caribe', startDate: '2027-01-10', endDate: '2027-01-15', count: 0 },
];

// El indicador vive en `Path=/ViajaCol`: la página de prueba se pone bajo esa ruta, como en el sitio.
const setHint = () => {
  document.cookie = 'viajacol.con_sesion=1; path=/ViajaCol';
};
const clearHint = () => {
  document.cookie = 'viajacol.con_sesion=; path=/ViajaCol; max-age=0';
};

beforeEach(() => {
  window.history.replaceState(null, '', '/ViajaCol/sitios/monserrate');
  useDraftStore.getState().clear();
});
afterEach(() => {
  cleanup();
  clearHint();
  window.history.replaceState(null, '', '/');
});

describe('useAddToTripViewModel (US2, US5)', () => {
  it('sin sesión agrega al borrador y avisa de los duplicados', () => {
    const { result } = renderHook(() => useAddToTripViewModel(entry));
    act(() => result.current.start());
    expect(result.current.state).toEqual({ phase: 'draft', result: 'added' });
    act(() => result.current.start());
    expect(result.current.state).toEqual({ phase: 'draft', result: 'duplicate' });
    expect(useDraftStore.getState().items).toEqual([
      { kind: 'sitio', slug: 'monserrate', title: 'Cerro de Monserrate' },
    ]);
  });

  it('con el indicador de sesión abre el diálogo y no toca el borrador', () => {
    setHint();
    const { result } = renderHook(() => useAddToTripViewModel(entry));
    act(() => result.current.start());
    expect(result.current.state).toEqual({ phase: 'dialog' });
    expect(useDraftStore.getState().items).toHaveLength(0);
    act(() => result.current.close());
    expect(result.current.state).toEqual({ phase: 'idle' });
  });
});

function dialog(actions: Partial<AddToTripDialogActions>) {
  const all: AddToTripDialogActions = {
    list: vi.fn().mockResolvedValue({ ok: true, trips }),
    add: vi.fn().mockResolvedValue({ ok: true }),
    ...actions,
  };
  return {
    actions: all,
    ...renderHook(() => useAddToTripDialogViewModel({ locale: 'es', ...entry }, all)),
  };
}

describe('useAddToTripDialogViewModel (US2)', () => {
  it('carga los viajes y agrega la ficha al elegido', async () => {
    const { actions, result } = dialog({});
    expect(result.current.status).toEqual({ phase: 'loading' });
    await waitFor(() => expect(result.current.status.phase).toBe('ready'));
    await act(async () => result.current.add(trips[0]!));
    expect(actions.add).toHaveBeenCalledWith('es', 't1', 'sitio', 'monserrate');
    expect(result.current.status).toMatchObject({ phase: 'added', tripName: 'Bogotá' });
    expect(result.current.trips[0]?.count).toBe(3);
  });

  it('muestra el error de la acción (duplicado, límite…)', async () => {
    const { result } = dialog({
      add: vi.fn().mockResolvedValue({ ok: false, error: 'duplicado' }),
    });
    await waitFor(() => expect(result.current.status.phase).toBe('ready'));
    await act(async () => result.current.add(trips[1]!));
    expect(result.current.status).toMatchObject({ phase: 'error', error: 'duplicado' });
  });

  it('si la sesión venció, borra el indicador y guarda en el borrador para no perder nada', async () => {
    setHint();
    const { result } = dialog({
      list: vi.fn().mockResolvedValue({ ok: false, error: 'sin-sesion' }),
    });
    await waitFor(() =>
      expect(result.current.status).toMatchObject({ phase: 'draft', result: 'added' }),
    );
    expect(document.cookie).not.toContain('viajacol.con_sesion=1');
    expect(useDraftStore.getState().items.map((item) => item.slug)).toEqual(['monserrate']);
  });

  it('si la sesión vence al agregar, también va al borrador', async () => {
    const { result } = dialog({
      add: vi.fn().mockResolvedValue({ ok: false, error: 'sin-sesion' }),
    });
    await waitFor(() => expect(result.current.status.phase).toBe('ready'));
    await act(async () => result.current.add(trips[0]!));
    expect(result.current.status).toMatchObject({ phase: 'draft', result: 'added' });
  });

  it('un error al cargar los viajes se muestra', async () => {
    const { result } = dialog({
      list: vi.fn().mockResolvedValue({ ok: false, error: 'no-disponible' }),
    });
    await waitFor(() =>
      expect(result.current.status).toMatchObject({ phase: 'error', error: 'no-disponible' }),
    );
  });
});
