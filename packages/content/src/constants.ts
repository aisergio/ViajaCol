/**
 * Constantes del catálogo sin dependencias: las pueden importar los componentes de cliente sin
 * arrastrar Zod ni los datos al bundle.
 */

/** Idiomas del catálogo. Español sin prefijo de ruta; inglés bajo `/en`. */
export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** Las seis regiones naturales de Colombia. */
export const REGION_SLUGS = [
  'caribe',
  'andina',
  'pacifica',
  'orinoquia',
  'amazonia',
  'insular',
] as const;
export type RegionSlug = (typeof REGION_SLUGS)[number];

/** Categorías del catálogo. Cada una es también un segmento de ruta (`/sitios/{slug}`). */
export const CATEGORIES = [
  'sitios',
  'fiestas',
  'platos',
  'experiencias',
  'regiones',
  'noticias',
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Alcance «amplio» acordado en la spec 004 (Clarifications). */
export const EXPECTED_COUNTS: Readonly<Record<Category, number>> = {
  regiones: 6,
  sitios: 30,
  fiestas: 24,
  platos: 18,
  experiencias: 12,
  noticias: 6,
};

export const SITE_KINDS = [
  'naturaleza',
  'historia',
  'ciudad',
  'arqueologia',
  'playa',
  'cultura',
  'parque',
] as const;
export type SiteKind = (typeof SITE_KINDS)[number];

export const DISH_KINDS = [
  'sopa',
  'plato-fuerte',
  'desayuno',
  'postre',
  'acompanamiento',
  'pasabocas',
] as const;
export type DishKind = (typeof DISH_KINDS)[number];
