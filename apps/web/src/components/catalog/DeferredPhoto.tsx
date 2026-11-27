'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
  /** La foto (`next/image`, sin su propio marcador). Se monta cuando el marco está cerca. */
  children: ReactNode;
  /** Texto alternativo de la foto: el marco lo anuncia mientras tanto. Vacío si es decorativa. */
  alt: string;
  /** Marcador borroso (data URL de 16 px): fondo del marco hasta que la foto termina de cargar. */
  blur: string;
};

/** Distancia a la pantalla desde la que se monta la foto. */
const ROOT_MARGIN = '300px 0px';

/**
 * Carga diferida con margen corto (spec 004, D-02). La carga nativa (`loading="lazy"`) pide las fotos
 * que están hasta 1250–2500 px por debajo de la pantalla: en un móvil eso suma medio megabyte que
 * compite con la foto principal. Aquí la foto se monta cuando su marco está a 300 px o menos.
 * Sin JavaScript, `<noscript>` entrega la foto con la carga nativa.
 */
export function DeferredPhoto({ children, alt, blur }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const element = frame.current;
    if (near || !element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: ROOT_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [near]);

  // Mientras la foto no está, el marco la representa: con su texto alternativo, o decorativo.
  const label = near ? {} : alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true };
  return (
    <div
      ref={frame}
      className="size-full bg-cover bg-center"
      style={{ backgroundImage: `url("${blur}")` }}
      {...label}
    >
      {near ? children : <noscript>{children}</noscript>}
    </div>
  );
}
