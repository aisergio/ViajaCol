import type { ResolvedTheme } from './themeStore';

/** Aplica el tema al documento: clase `dark` y `color-scheme` para controles nativos. */
export function applyTheme(
  theme: ResolvedTheme,
  root: HTMLElement = document.documentElement,
): void {
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}
