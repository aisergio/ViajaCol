import { z } from 'zod';
import { DISH_KINDS, REGION_SLUGS, SITE_KINDS, type Category } from './constants';

export * from './constants';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug en minúsculas con guiones');
const commonsFile = z
  .string()
  .regex(/^File:.+\.(jpe?g|png|tiff?|webp)$/i, 'título de archivo de Commons');
/** [latitud, longitud] dentro de Colombia, San Andrés incluido. */
const coords = z.tuple([z.number().min(-5).max(14), z.number().min(-82).max(-66)]);
const region = z.enum(REGION_SLUGS);

const text = z.object({
  name: z.string().min(2).max(80),
  summary: z.string().min(20).max(180),
  body: z.array(z.string().min(40).max(700)).min(1).max(3),
  alt: z.string().min(10).max(160),
});

const photoFields = {
  photo: commonsFile,
  /** Términos de búsqueda para el modo `candidates` del script de fotos. */
  photoQuery: z.string().min(3).optional(),
};

export const regionSchema = z.object({
  slug: region,
  departments: z.array(z.string().min(3)).min(1),
  ...photoFields,
  es: text,
  en: text,
});

export const siteSchema = z.object({
  slug,
  region,
  department: z.string().min(3),
  municipality: z.string().min(3),
  coords,
  kind: z.enum(SITE_KINDS),
  ...photoFields,
  es: text,
  en: text,
});

const festivalText = text.extend({ when: z.string().min(3).max(120) });
export const festivalSchema = z.object({
  slug,
  region,
  department: z.string().min(3),
  municipality: z.string().min(3),
  coords,
  months: z
    .array(z.number().int().min(1).max(12))
    .min(1)
    .max(3)
    .refine((months) => months.every((m, i) => i === 0 || m > months[i - 1]!), {
      message: 'meses sin repetir y en orden',
    }),
  unesco: z.boolean().optional(),
  ...photoFields,
  es: festivalText,
  en: festivalText,
});

const dishText = text.extend({
  origin: z.string().min(3).max(80),
  ingredients: z.array(z.string().min(2).max(40)).min(3).max(10),
});
export const dishSchema = z.object({
  slug,
  region,
  kind: z.enum(DISH_KINDS),
  ...photoFields,
  es: dishText,
  en: dishText,
});

const experienceText = text.extend({
  season: z.string().min(5).max(120),
  duration: z.string().min(3).max(60),
});
export const experienceSchema = z.object({
  slug,
  region,
  department: z.string().min(3),
  municipality: z.string().min(3),
  coords,
  ...photoFields,
  es: experienceText,
  en: experienceText,
});

export const newsSchema = z.object({
  slug,
  date: z.iso.date(),
  region: region.optional(),
  /** Las noticias son de demostración (constitución, «Contenido»). */
  demo: z.literal(true),
  ...photoFields,
  es: text,
  en: text,
});

export const mediaEntrySchema = z.object({
  file: commonsFile,
  page: z.url(),
  author: z.string().min(1).max(200),
  license: z.string().min(2).max(40),
  licenseUrl: z.union([z.url(), z.literal('')]),
  hash: z.string().regex(/^[0-9a-f]{8}$/),
  /** Ancho de la variante mayor: 1600, o el del original si era menor (mínimo 1200). */
  width: z.number().int().min(1200).max(1600),
  height: z.number().int().min(200),
  blur: z.string().startsWith('data:image/webp;base64,').max(1400),
});

export const catalogSchemas = {
  regiones: z.array(regionSchema),
  sitios: z.array(siteSchema),
  fiestas: z.array(festivalSchema),
  platos: z.array(dishSchema),
  experiencias: z.array(experienceSchema),
  noticias: z.array(newsSchema),
} as const;

export const mediaSchema = z.record(z.string(), mediaEntrySchema);

export type RegionEntry = z.infer<typeof regionSchema>;
export type SiteEntry = z.infer<typeof siteSchema>;
export type FestivalEntry = z.infer<typeof festivalSchema>;
export type DishEntry = z.infer<typeof dishSchema>;
export type ExperienceEntry = z.infer<typeof experienceSchema>;
export type NewsEntry = z.infer<typeof newsSchema>;
export type MediaEntry = z.infer<typeof mediaEntrySchema>;

export type EntryByCategory = {
  regiones: RegionEntry;
  sitios: SiteEntry;
  fiestas: FestivalEntry;
  platos: DishEntry;
  experiencias: ExperienceEntry;
  noticias: NewsEntry;
};

/** Clave de una foto en el manifiesto y en `public/media`. */
export function mediaKey(category: Category, slug: string): string {
  return `${category}/${slug}`;
}
