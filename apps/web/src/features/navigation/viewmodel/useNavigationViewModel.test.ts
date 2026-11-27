import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pathname = vi.hoisted(() => ({ value: '/' }));
vi.mock('@/i18n/navigation', () => ({ usePathname: () => pathname.value }));

import { useNavigationViewModel } from './useNavigationViewModel';

describe('useNavigationViewModel', () => {
  beforeEach(() => {
    pathname.value = '/';
  });

  it('en la portada no marca ninguna sección (la portada se abre con el logo)', () => {
    const { result } = renderHook(() => useNavigationViewModel());
    expect(result.current.activeId).toBeNull();
    expect(result.current.items.filter((item) => item.isActive)).toEqual([]);
  });

  it('marca Noticias en su lista y en sus fichas', () => {
    pathname.value = '/noticias/nace-el-catalogo';
    const { result } = renderHook(() => useNavigationViewModel());
    expect(result.current.activeId).toBe('noticias');
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
