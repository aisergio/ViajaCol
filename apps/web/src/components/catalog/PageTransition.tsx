import { ViewTransition, type ReactNode } from 'react';

/**
 * Transición de página (D-08): los enlaces a fichas marcan `nav-forward` y los de regreso `nav-back`
 * (deslizamiento direccional); el resto de navegaciones hace un fundido. Va en cada página, no en
 * el layout, porque el layout no se desmonta al navegar. Con movimiento reducido no hay animación.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'auto' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'auto' }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
