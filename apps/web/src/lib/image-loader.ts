/**
 * Cargador de `next/image` para las fotos del catálogo (spec 004, D-02). Las variantes ya existen
 * como estáticos en S3 (`/ViajaCol/media/*`), así que no hay optimización en Lambda: el cargador solo
 * elige el archivo del ancho adecuado. `src` llega como `media/<categoria>/<slug>-<hash>`.
 */
export const MEDIA_WIDTHS = [480, 960, 1600] as const;

const BASE_PATH = '/ViajaCol';

type LoaderProps = { src: string; width: number; quality?: number };

export default function mediaLoader({ src, width }: LoaderProps): string {
  if (!src.startsWith('media/')) return src;
  const variant = MEDIA_WIDTHS.find((candidate) => candidate >= width) ?? 1600;
  return `${BASE_PATH}/${src}-${variant}.webp`;
}
