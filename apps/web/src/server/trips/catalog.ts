import { type Category, getDetail } from '@viajacol/content';
import {
  CATALOG_KINDS,
  type CatalogKind,
  type CatalogRef,
  type TripItem,
  catalogKey,
} from '@/domain/trip';

/** Categoría del catálogo de cada tipo de elemento del viaje. */
export const KIND_TO_CATEGORY: Record<CatalogKind, Category> = {
  sitio: 'sitios',
  fiesta: 'fiestas',
  plato: 'platos',
  experiencia: 'experiencias',
};

export const CATEGORY_TO_KIND: Partial<Record<Category, CatalogKind>> = {
  sitios: 'sitio',
  fiestas: 'fiesta',
  platos: 'plato',
  experiencias: 'experiencia',
};

/** Nombre de una ficha en el idioma pedido; `null` si no existe (el nombre nunca viene del navegador). */
export function catalogTitle(kind: CatalogKind, slug: string, locale: 'es' | 'en'): string | null {
  return getDetail(KIND_TO_CATEGORY[kind], slug, locale)?.name ?? null;
}

export function catalogRef(
  kind: CatalogKind,
  slug: string,
  locale: 'es' | 'en',
): CatalogRef | null {
  const category = KIND_TO_CATEGORY[kind];
  const detail = getDetail(category, slug, locale);
  if (!detail) return null;
  return {
    name: detail.name,
    href: `/${category}/${slug}`,
    place: detail.place,
    coords: detail.coords,
  };
}

const isCatalogKind = (kind: string): kind is CatalogKind =>
  (CATALOG_KINDS as readonly string[]).includes(kind);

/**
 * Referencias de las fichas de un viaje, por `catalogKey`. Viajan al editor como props: el navegador
 * no carga el catálogo completo.
 */
export function catalogRefs(
  items: readonly TripItem[],
  locale: 'es' | 'en',
): Record<string, CatalogRef | null> {
  const refs: Record<string, CatalogRef | null> = {};
  for (const item of items) {
    if (!item.slug || !isCatalogKind(item.kind)) continue;
    refs[catalogKey(item.kind, item.slug)] = catalogRef(item.kind, item.slug, locale);
  }
  return refs;
}
