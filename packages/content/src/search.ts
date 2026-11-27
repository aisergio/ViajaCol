import { getCards } from './index';
import { CATEGORIES, type Locale } from './schema';
import type { SearchIndex, SearchItem } from './search-types';

/** Índice compacto por idioma (contrato `contracts/search-index.md`). */
export function buildSearchIndex(locale: Locale): SearchIndex {
  const collator = new Intl.Collator(locale);
  const items: SearchItem[] = CATEGORIES.flatMap((category) =>
    getCards(category, locale)
      .map((card) => ({
        c: category,
        s: card.slug,
        n: card.name,
        r: card.regionName ?? '',
        p: card.place ?? '',
      }))
      .sort((a, b) => collator.compare(a.n, b.n)),
  );
  return { v: 1, locale, items };
}
