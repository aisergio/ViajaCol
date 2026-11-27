import type { Category, Locale } from '@viajacol/content/constants';

/**
 * Tamaño y dirección pública de la vista previa para redes. Va aparte de `og-image.tsx` para que las
 * páginas no importen `sharp` ni `next/og`, que solo se usan en el build.
 */
export const OG_SIZE = { width: 1200, height: 630 };

/** Incluye `basePath`: `metadataBase` solo aporta el origen. */
export function ogImagePath(category: Category, locale: Locale, slug: string): string {
  return `/ViajaCol/api/og/${category}/${locale}/${slug}`;
}
