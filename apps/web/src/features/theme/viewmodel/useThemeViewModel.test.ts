import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockPrefersDark } from '../../../../vitest.setup';
import { THEME_STORAGE_KEY, useThemeStore } from '../model/themeStore';
import { useThemeViewModel } from './useThemeViewModel';

describe('useThemeViewModel', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'system' });
    mockPrefersDark(false);
  });

  it('rehidrata la elección guardada y la aplica al documento', async () => {
    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ state: { mode: 'dark' }, version: 0 }),
    );
    const { result } = renderHook(() => useThemeViewModel());
    await waitFor(() => expect(result.current.mode).toBe('dark'));
    expect(document.documentElement).toHaveClass('dark');
  });

  it('en modo sistema sigue la preferencia oscura del sistema operativo', async () => {
    mockPrefersDark(true);
    const { result } = renderHook(() => useThemeViewModel());
    await waitFor(() => expect(result.current.resolved).toBe('dark'));
  });

  it('el comando cycle avanza el modo y expone el siguiente', async () => {
    const { result } = renderHook(() => useThemeViewModel());
    await waitFor(() => expect(useThemeStore.persist.hasHydrated()).toBe(true));
    expect(result.current.nextMode).toBe('light');
    act(() => result.current.cycle());
    expect(result.current.mode).toBe('light');
    expect(result.current.nextMode).toBe('dark');
  });
});
