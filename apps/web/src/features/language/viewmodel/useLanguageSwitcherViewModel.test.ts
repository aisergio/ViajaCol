import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ locale: 'es', pathname: '/sitios' }));
vi.mock('next-intl', () => ({ useLocale: () => state.locale }));
vi.mock('@/i18n/navigation', () => ({ usePathname: () => state.pathname }));
vi.mock('@/i18n/routing', () => ({ routing: { locales: ['es', 'en'], defaultLocale: 'es' } }));

import { useLanguageSwitcherViewModel } from './useLanguageSwitcherViewModel';

describe('useLanguageSwitcherViewModel', () => {
  it('ofrece ambos idiomas apuntando a la misma sección', () => {
    const { result } = renderHook(() => useLanguageSwitcherViewModel());
    expect(result.current.options).toEqual([
      { code: 'es', href: '/sitios', isCurrent: true },
      { code: 'en', href: '/sitios', isCurrent: false },
    ]);
  });

  it('marca inglés como actual cuando la ruta está en inglés', () => {
    state.locale = 'en';
    state.pathname = '/fiestas';
    const { result } = renderHook(() => useLanguageSwitcherViewModel());
    expect(result.current.locale).toBe('en');
    expect(result.current.options.find((option) => option.isCurrent)?.code).toBe('en');
    expect(result.current.options.every((option) => option.href === '/fiestas')).toBe(true);
  });
});
