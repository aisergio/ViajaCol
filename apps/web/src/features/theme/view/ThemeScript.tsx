import { THEME_STORAGE_KEY } from '../model/themeStore';

/**
 * Script mínimo que se ejecuta antes del primer pintado para aplicar el tema guardado
 * (o el del sistema) y evitar el destello del tema equivocado. Lee el formato de Zustand persist.
 */
const script = `(function(){try{var s=JSON.parse(localStorage.getItem('${THEME_STORAGE_KEY}')||'null');var m=(s&&s.state&&s.state.mode)||'system';var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
