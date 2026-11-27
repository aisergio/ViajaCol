import type { CardItem } from '@viajacol/content';
import { REGION_SLUGS, type RegionSlug } from '@viajacol/content/constants';
import { normalizeText } from '@/lib/normalize-text';

export { normalizeText };

/** Largo máximo del texto de filtro (contrato `routes.md`). */
export const MAX_QUERY_LENGTH = 60;

export type CatalogFilters = {
  region: RegionSlug | null;
  /** 1–12, solo en Fiestas. */
  month: number | null;
  query: string;
};

export const EMPTY_FILTERS: CatalogFilters = { region: null, month: null, query: '' };

/** Valores de la URL a filtros válidos: lo inválido se ignora sin error (FR-005, casos borde). */
export function sanitizeFilters(raw: {
  region?: string | null;
  month?: number | null;
  query?: string | null;
}): CatalogFilters {
  const region = REGION_SLUGS.find((slug) => slug === raw.region) ?? null;
  const month =
    typeof raw.month === 'number' &&
    Number.isInteger(raw.month) &&
    raw.month >= 1 &&
    raw.month <= 12
      ? raw.month
      : null;
  return { region, month, query: (raw.query ?? '').slice(0, MAX_QUERY_LENGTH) };
}

export function hasActiveFilters(filters: CatalogFilters): boolean {
  return filters.region !== null || filters.month !== null || filters.query.trim() !== '';
}

function haystack(card: CardItem): string {
  return normalizeText(
    [card.name, card.place ?? '', card.regionName ?? '', card.summary].join(' '),
  );
}

/** Combina los filtros con «y». Cada palabra del texto debe aparecer en la ficha. */
export function filterCards(cards: readonly CardItem[], filters: CatalogFilters): CardItem[] {
  const words = normalizeText(filters.query).split(/\s+/).filter(Boolean);
  return cards.filter((card) => {
    if (filters.region && card.region !== filters.region) return false;
    if (filters.month && !card.months?.includes(filters.month)) return false;
    if (words.length === 0) return true;
    const text = haystack(card);
    return words.every((word) => text.includes(word));
  });
}
