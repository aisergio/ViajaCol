'use client';

import { useEffect, useState } from 'react';
import { usePathname } from '@/i18n/navigation';

/** ViewModel del menú móvil: estado local de apertura, que se cierra al navegar o con Escape. */
export function useMobileNavViewModel() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  // Cierra el menú cuando cambia la ruta (ajuste de estado durante el render, sin efecto).
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return {
    open,
    toggle: () => setOpen((value) => !value),
    close: () => setOpen(false),
  };
}
