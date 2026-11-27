'use client';

import { type ComponentProps, useState } from 'react';
import { Link } from '@/i18n/navigation';

type Props = ComponentProps<typeof Link>;

/**
 * Enlace que precarga su ruta solo cuando hay intención: el puntero encima, un toque o el foco (guía
 * «Optimizing prefetching» de Next.js). Una página con muchas tarjetas ya no pide en segundo plano
 * cada ficha visible al cargar: menos peticiones contra el límite del borde y menos trabajo mientras
 * la página arranca. Al hacer clic, la navegación aprovecha la precarga que ya empezó.
 */
export function IntentLink({ onPointerEnter, onTouchStart, onFocus, ...props }: Props) {
  const [intent, setIntent] = useState(false);

  return (
    <Link
      {...props}
      prefetch={intent ? null : false}
      onPointerEnter={(event) => {
        setIntent(true);
        onPointerEnter?.(event);
      }}
      onTouchStart={(event) => {
        setIntent(true);
        onTouchStart?.(event);
      }}
      onFocus={(event) => {
        setIntent(true);
        onFocus?.(event);
      }}
    />
  );
}
