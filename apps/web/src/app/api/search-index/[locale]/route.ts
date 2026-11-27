import { LOCALES } from '@viajacol/content/constants';
import { buildSearchIndex } from '@viajacol/content/search';
import { z } from 'zod';

/**
 * Índice de búsqueda por idioma (contrato `contracts/search-index.md`). Se genera en el build y queda
 * estático: la CDN lo sirve hasta la siguiente publicación y el cliente lo pide una vez por sesión.
 */
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

const paramsSchema = z.object({ locale: z.enum(LOCALES) });

export async function GET(_request: Request, context: { params: Promise<{ locale: string }> }) {
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return new Response('Not Found', { status: 404 });
  return Response.json(buildSearchIndex(parsed.data.locale));
}
