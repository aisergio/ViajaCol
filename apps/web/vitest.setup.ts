import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

/** jsdom no implementa matchMedia; cada prueba puede reemplazarlo con su propio valor. */
export function mockPrefersDark(matches: boolean) {
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    })),
  );
}

mockPrefersDark(false);

afterEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.removeAttribute('style');
});
