import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

/** Clave en localStorage; el script anti-destello lee el mismo formato. */
export const THEME_STORAGE_KEY = 'viajacol:theme';

const ORDER: readonly ThemeMode[] = ['system', 'light', 'dark'];

export function nextThemeMode(mode: ThemeMode): ThemeMode {
  return ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length] ?? 'system';
}

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  if (mode === 'system') return prefersDark ? 'dark' : 'light';
  return mode;
}

type ThemeState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  cycle: () => void;
};

/**
 * Store compartido de la preferencia de tema (estado global de preferencia).
 * `skipHydration` evita diferencias de hidratación: el ViewModel rehidrata al montar.
 */
export const useThemeStore = create<ThemeState>()(
  devtools(
    persist(
      (set, get) => ({
        mode: 'system',
        setMode: (mode) => set({ mode }, false, 'theme/setMode'),
        cycle: () => set({ mode: nextThemeMode(get().mode) }, false, 'theme/cycle'),
      }),
      {
        name: THEME_STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ mode: state.mode }),
        skipHydration: true,
      },
    ),
    { name: 'viajacol/theme', enabled: process.env.NODE_ENV === 'development' },
  ),
);
