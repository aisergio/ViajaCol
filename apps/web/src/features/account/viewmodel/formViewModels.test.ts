import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccountStore } from '../model/accountStore';
import { useDeleteAccountViewModel } from './useDeleteAccountViewModel';
import { useProfileViewModel } from './useProfileViewModel';

describe('useProfileViewModel', () => {
  beforeEach(() => useAccountStore.getState().signIn('Ana'));

  it('empieza con el nombre guardado y sin errores', () => {
    const { result } = renderHook(() => useProfileViewModel('Ana', vi.fn()));
    expect(result.current).toMatchObject({
      name: 'Ana',
      saved: false,
      error: null,
      pending: false,
    });
  });

  it('al guardar, el nombre nuevo pasa al store compartido', async () => {
    const action = vi.fn().mockResolvedValue({ status: 'ok', name: 'Ana María' });
    const { result } = renderHook(() => useProfileViewModel('Ana', action));
    await act(async () => result.current.formAction(new FormData()));
    await waitFor(() => expect(result.current.saved).toBe(true));
    expect(result.current.name).toBe('Ana María');
    expect(useAccountStore.getState().name).toBe('Ana María');
  });

  it('expone el error de la acción', async () => {
    const action = vi.fn().mockResolvedValue({ status: 'error', error: 'nombre-invalido' });
    const { result } = renderHook(() => useProfileViewModel('Ana', action));
    await act(async () => result.current.formAction(new FormData()));
    await waitFor(() => expect(result.current.error).toBe('nombre-invalido'));
    expect(useAccountStore.getState().name).toBe('Ana');
  });
});

describe('useDeleteAccountViewModel', () => {
  it('muestra la confirmación y permite cancelar', () => {
    const { result } = renderHook(() => useDeleteAccountViewModel(vi.fn()));
    expect(result.current.confirming).toBe(false);
    act(() => result.current.start());
    expect(result.current.confirming).toBe(true);
    act(() => result.current.cancel());
    expect(result.current.confirming).toBe(false);
  });

  it('expone el error de confirmación', async () => {
    const action = vi.fn().mockResolvedValue({ status: 'error', error: 'confirmacion' });
    const { result } = renderHook(() => useDeleteAccountViewModel(action));
    await act(async () => result.current.formAction(new FormData()));
    await waitFor(() => expect(result.current.error).toBe('confirmacion'));
  });
});
