import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const pathname = vi.hoisted(() => ({ value: '/' }));
vi.mock('@/i18n/navigation', () => ({ usePathname: () => pathname.value }));

import { useMobileNavViewModel } from './useMobileNavViewModel';

describe('useMobileNavViewModel', () => {
  it('abre, cierra y alterna el menú', () => {
    const { result } = renderHook(() => useMobileNavViewModel());
    expect(result.current.open).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);
    act(() => result.current.close());
    expect(result.current.open).toBe(false);
  });

  it('se cierra con Escape', () => {
    const { result } = renderHook(() => useMobileNavViewModel());
    act(() => result.current.toggle());
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.open).toBe(false);
  });

  it('se cierra al cambiar de ruta', () => {
    pathname.value = '/';
    const { result, rerender } = renderHook(() => useMobileNavViewModel());
    act(() => result.current.toggle());
    pathname.value = '/sitios';
    rerender();
    expect(result.current.open).toBe(false);
  });
});
