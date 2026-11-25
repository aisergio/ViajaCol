import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pathname = vi.hoisted(() => ({ value: '/' }));
vi.mock('@/i18n/navigation', () => ({ usePathname: () => pathname.value }));

import { useNavigationViewModel } from './useNavigationViewModel';

describe('useNavigationViewModel', () => {
  beforeEach(() => {
    pathname.value = '/';
  });

  it('marca la portada como activa en la raíz', () => {
    const { result } = renderHook(() => useNavigationViewModel());
    expect(result.current.activeId).toBe('noticias');
    expect(result.current.items.filter((item) => item.isActive).map((item) => item.id)).toEqual([
      'noticias',
    ]);
  });

  it('marca la sección según la ruta y deshabilita Guías', () => {
    pathname.value = '/fiestas';
    const { result } = renderHook(() => useNavigationViewModel());
    expect(result.current.activeId).toBe('fiestas');
    const guias = result.current.items.find((item) => item.id === 'guias');
    expect(guias?.isDisabled).toBe(true);
    expect(guias?.isActive).toBe(false);
  });
});
