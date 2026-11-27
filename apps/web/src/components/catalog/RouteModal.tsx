'use client';

import { Modal } from '@viajacol/ui';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  closeLabel: string;
  /** Ruta de la ficha (sin `basePath`): si la URL ya es otra, la ventana no se muestra. */
  path: string;
  size?: 'md' | 'lg';
  children: ReactNode;
};

/**
 * Ventana de una ruta interceptada (D-04). Cerrar es volver atrás en el historial: la URL regresa a
 * la de la lista y el slot `@modal` vuelve a `default.tsx`.
 */
export function RouteModal({ title, closeLabel, path, size, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  if (pathname !== path) return null;
  return (
    <Modal title={title} closeLabel={closeLabel} size={size} onClose={() => router.back()}>
      {children}
    </Modal>
  );
}
