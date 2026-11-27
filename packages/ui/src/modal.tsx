'use client';

import { Dialog } from '@base-ui/react/dialog';
import type { ReactNode } from 'react';
import { cn } from './cn';

type Props = {
  /** Título accesible de la ventana (también visible si `showTitle`). */
  title: string;
  /** Etiqueta del botón de cerrar. */
  closeLabel: string;
  /** Se llama con Escape, clic fuera o el botón de cerrar. */
  onClose: () => void;
  children: ReactNode;
  showTitle?: boolean;
  size?: 'md' | 'lg';
  className?: string;
};

/**
 * Ventana modal sobre el `Dialog` de Base UI: atrapa el foco, cierra con Escape o clic fuera, deja el
 * fondo inerte y devuelve el foco al cerrar. Siempre está abierta mientras está montada; quien la
 * monta decide qué hace al cerrar (en las rutas interceptadas, volver atrás en el historial).
 */
export function Modal({
  title,
  closeLabel,
  onClose,
  children,
  showTitle = false,
  size = 'lg',
  className,
}: Props) {
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6">
          <Dialog.Popup
            className={cn(
              'relative w-full overflow-hidden rounded-t-xl bg-background text-foreground shadow-2xl outline-none sm:rounded-xl',
              size === 'lg' ? 'max-w-4xl' : 'max-w-xl',
              className,
            )}
          >
            <Dialog.Title
              className={showTitle ? 'px-6 pt-6 font-display text-2xl font-bold' : 'sr-only'}
            >
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label={closeLabel}
              className="absolute top-3 right-3 z-10 inline-flex size-11 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md hover:bg-surface"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </Dialog.Close>
            {children}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
