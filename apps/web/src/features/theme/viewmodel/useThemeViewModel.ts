'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { applyTheme } from '../model/applyTheme';
import { nextThemeMode, resolveTheme, useThemeStore } from '../model/themeStore';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeToScheme(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function subscribeToHydration(onChange: () => void) {
  return useThemeStore.persist.onFinishHydration(onChange);
}

/** ViewModel del tema: une el store compartido con la preferencia del sistema operativo. */
export function useThemeViewModel() {
  const mode = useThemeStore((state) => state.mode);
  const cycle = useThemeStore((state) => state.cycle);
  const prefersDark = useSyncExternalStore(
    subscribeToScheme,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => useThemeStore.persist.hasHydrated(),
    () => false,
  );

  useEffect(() => {
    void useThemeStore.persist.rehydrate();
  }, []);

  const resolved = resolveTheme(mode, prefersDark);

  useEffect(() => {
    // Hasta rehidratar manda el script anti-destello; después, el store.
    if (hydrated) applyTheme(resolved);
  }, [hydrated, resolved]);

  return { mode, resolved, nextMode: nextThemeMode(mode), cycle };
}
