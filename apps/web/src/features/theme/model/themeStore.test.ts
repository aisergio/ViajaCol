import { beforeEach, describe, expect, it } from 'vitest';
import { applyTheme } from './applyTheme';
import { nextThemeMode, resolveTheme, THEME_STORAGE_KEY, useThemeStore } from './themeStore';

describe('themeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'system' });
  });

  it('recorre el ciclo sistema → claro → oscuro → sistema', () => {
    expect(nextThemeMode('system')).toBe('light');
    expect(nextThemeMode('light')).toBe('dark');
    expect(nextThemeMode('dark')).toBe('system');
    useThemeStore.getState().cycle();
    expect(useThemeStore.getState().mode).toBe('light');
  });

  it('resuelve el tema del sistema según la preferencia', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('persiste la elección con la clave viajacol:theme', () => {
    useThemeStore.getState().setMode('dark');
    const saved = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? 'null');
    expect(saved?.state?.mode).toBe('dark');
  });

  it('aplica la clase dark y color-scheme al documento', () => {
    applyTheme('dark');
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    applyTheme('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });
});
