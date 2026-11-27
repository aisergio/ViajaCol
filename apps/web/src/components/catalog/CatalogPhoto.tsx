import type { Photo } from '@viajacol/content';
import { cn } from '@viajacol/ui';
import Image from 'next/image';
import { ViewTransition, type ReactNode } from 'react';
import { DeferredPhoto } from './DeferredPhoto';

type Props = {
  photo: Photo | null;
  /** Ancho que ocupa la foto, para que el navegador elija la variante (480, 960 o 1600). */
  sizes: string;
  /**
   * Foto principal de la página (LCP): se pide de inmediato y con prioridad alta. No usa `preload`
   * de `next/image`, porque esa pista viaja en el payload RSC y el prefetch de un enlace a la página
   * descargaría la foto sin que nadie la vea.
   */
  priority?: boolean;
  className?: string;
  /** Nombre compartido para el morph de la tarjeta a la portada de la ficha. */
  transitionName?: string;
  fallbackLabel: string;
};

/**
 * Foto del catálogo: variantes pregeneradas en S3 (D-02), marcador borroso y morph opcional (D-08).
 * Las fotos que no son la principal se montan al acercarse a la pantalla (`DeferredPhoto`).
 */
export function CatalogPhoto({
  photo,
  sizes,
  priority = false,
  className,
  transitionName,
  fallbackLabel,
}: Props) {
  let content: ReactNode;
  if (!photo) {
    content = (
      <div
        role="img"
        aria-label={fallbackLabel}
        className={cn(
          'size-full bg-linear-to-br from-flag-yellow via-flag-blue to-flag-red',
          className,
        )}
      />
    );
  } else {
    const image = (
      <Image
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        // En las diferidas, el marcador es el fondo de `DeferredPhoto`: no se repite en el HTML.
        placeholder={priority ? 'blur' : 'empty'}
        blurDataURL={priority ? photo.blur : undefined}
        className={cn('size-full object-cover', className)}
      />
    );
    content = priority ? (
      image
    ) : (
      <DeferredPhoto alt={photo.alt} blur={photo.blur}>
        {image}
      </DeferredPhoto>
    );
  }
  if (!transitionName) return content;
  return (
    <ViewTransition name={transitionName} share="morph" default="none">
      {content}
    </ViewTransition>
  );
}
