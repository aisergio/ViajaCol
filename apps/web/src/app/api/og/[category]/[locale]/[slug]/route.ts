import { CATEGORIES, getSlugs, LOCALES } from '@viajacol/content';
import { z } from 'zod';
import { renderOgImage } from '@/components/catalog/og-image';

/**
 * Vista previa para redes de cada ficha (FR-009, contrato `routes.md`). Es un Route Handler estático
 * y no la convención `opengraph-image`, porque esa convención arma la URL con el segmento interno
 * `/es` y sin `basePath`, y su URL no se puede corregir desde los metadatos.
 */
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.flatMap((category) =>
    LOCALES.flatMap((locale) => getSlugs(category).map((slug) => ({ category, locale, slug }))),
  );
}

const paramsSchema = z.object({
  category: z.enum(CATEGORIES),
  locale: z.enum(LOCALES),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ category: string; locale: string; slug: string }> },
) {
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return new Response('Not Found', { status: 404 });
  const { category, locale, slug } = parsed.data;
  return renderOgImage(category, locale, slug);
}
