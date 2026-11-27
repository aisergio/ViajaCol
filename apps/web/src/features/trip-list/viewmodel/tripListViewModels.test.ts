import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDeleteTripViewModel } from './useDeleteTripViewModel';
import { useTripFormViewModel } from './useTripFormViewModel';

afterEach(cleanup);

const defaults = {
  name: '',
  startDate: '2026-12-01',
  endDate: '2026-12-03',
  travelers: '1',
  budget: '0',
};

describe('useTripFormViewModel (US1)', () => {
  it('empieza con los valores por omisión y sin errores', () => {
    const { result } = renderHook(() => useTripFormViewModel(vi.fn(), defaults, { current: null }));
    expect(result.current).toMatchObject({
      values: defaults,
      errors: {},
      error: null,
      pending: false,
    });
  });

  it('con errores conserva lo escrito, marca los campos y lleva el foco al primero (escenario 3)', async () => {
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.setAttribute('aria-invalid', 'true');
    form.append(input);
    document.body.append(form);
    const values = { ...defaults, name: 'Viaje', endDate: '2026-11-30' };
    const action = vi.fn().mockResolvedValue({
      status: 'error',
      error: 'invalido',
      fields: { endDate: 'fin-antes-de-inicio' },
      values,
    });

    const { result } = renderHook(() => useTripFormViewModel(action, defaults, { current: form }));
    await act(async () => result.current.formAction(new FormData()));
    await waitFor(() => expect(result.current.error).toBe('invalido'));
    expect(result.current.errors).toEqual({ endDate: 'fin-antes-de-inicio' });
    expect(result.current.values).toEqual(values);
    expect(document.activeElement).toBe(input);
    form.remove();
  });

  it('un error sin campos (límite, sin sesión) no mueve el foco', async () => {
    const action = vi.fn().mockResolvedValue({ status: 'error', error: 'limite' });
    const { result } = renderHook(() => useTripFormViewModel(action, defaults, { current: null }));
    await act(async () => result.current.formAction(new FormData()));
    await waitFor(() => expect(result.current.error).toBe('limite'));
    expect(result.current.values).toEqual(defaults);
  });
});

describe('useDeleteTripViewModel (US1, escenario 4)', () => {
  it('pide la confirmación, permite cancelar y expone el error', async () => {
    const action = vi.fn().mockResolvedValue({ status: 'error', error: 'invalido' });
    const { result } = renderHook(() => useDeleteTripViewModel(action));
    expect(result.current.confirming).toBe(false);
    act(() => result.current.start());
    expect(result.current.confirming).toBe(true);
    await act(async () => result.current.formAction(new FormData()));
    await waitFor(() => expect(result.current.error).toBe('invalido'));
    act(() => result.current.cancel());
    expect(result.current.confirming).toBe(false);
  });
});
