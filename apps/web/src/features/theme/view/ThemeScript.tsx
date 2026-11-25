import Script from 'next/script';
import { THEME_STORAGE_KEY } from '../model/themeStore';

/**
 * Script mínimo que se ejecuta antes de la hidratación para aplicar el tema guardado (o el del
 * sistema) y evitar el destello del tema equivocado. Lee el formato de Zustand persist.
 * `next/script` con `beforeInteractive` lo inyecta en <head> sin que React lo vuelva a renderizar.
 */
const script = `(function(){try{var s=JSON.parse(localStorage.getItem('${THEME_STORAGE_KEY}')||'null');var m=(s&&s.state&&s.state.mode)||'system';var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export function ThemeScript() {
  return (
    // La regla es de Pages Router (_document.js). En App Router este layout define <html> y Next
    // inyecta el script en <head> antes de hidratar (verificado en E2E: e2e/tema.spec.ts).
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
    <Script id="viajacol-theme" strategy="beforeInteractive">
      {script}
    </Script>
  );
}
