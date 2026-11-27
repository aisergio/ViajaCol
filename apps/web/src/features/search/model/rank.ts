import { CATEGORIES, type Category } from '@viajacol/content/constants';
import type { SearchItem } from '@viajacol/content/search-types';
import { normalizeText } from '@/lib/normalize-text';

/** Sugerencias por categoría y en total: la lista se lee de un vistazo y se dibuja rápido (SC-004). */
export const MAX_PER_CATEGORY = 4;
export const MAX_SUGGESTIONS = 12;
/** Con una sola letra coincide casi todo: se sugiere desde dos letras (sin contar espacios). */
export const MIN_QUERY_LENGTH = 2;

export type SearchGroup = { category: Category; items: SearchItem[] };

/**
 * Puntaje de una coincidencia (menor es mejor):
 * 0 el nombre empieza por el texto · 1 una palabra del nombre empieza por la primera palabra buscada ·
 * 2 el nombre contiene esa palabra · 3 solo coincide el lugar o la región.
 */
function score(name: string, query: string, firstWord: string): number {
  if (name.startsWith(query)) return 0;
  if (name.split(/[\s-]+/).some((word) => word.startsWith(firstWord))) return 1;
  if (name.includes(firstWord)) return 2;
  return 3;
}

/** El texto alcanza para sugerir: al menos `MIN_QUERY_LENGTH` letras, sin contar espacios. */
export function isSearchable(query: string): boolean {
  return normalizeText(query).replace(/\s+/g, '').length >= MIN_QUERY_LENGTH;
}

/**
 * Sugerencias agrupadas por categoría (contrato `search-index.md`). Cada palabra del texto debe
 * aparecer en el nombre, el lugar o la región. Los grupos se ordenan por su mejor coincidencia, y el
 * total se recorta a `MAX_SUGGESTIONS` empezando por los mejores grupos.
 */
export function rankSearchResults(
  items: readonly SearchItem[],
  query: string,
  perCategory = MAX_PER_CATEGORY,
): SearchGroup[] {
  const normalized = normalizeText(query).replace(/\s+/g, ' ');
  if (!isSearchable(normalized)) return [];
  const words = normalized.split(' ');
  const firstWord = words[0]!;

  const matches: Array<{ item: SearchItem; score: number; order: number }> = [];
  items.forEach((item, order) => {
    const name = normalizeText(item.n);
    const all = `${name} ${normalizeText(item.p)} ${normalizeText(item.r)}`;
    if (!words.every((word) => all.includes(word))) return;
    matches.push({ item, score: score(name, normalized, firstWord), order });
  });
  matches.sort((a, b) => a.score - b.score || a.order - b.order);

  const groups = CATEGORIES.map((category) => {
    const inCategory = matches.filter((match) => match.item.c === category);
    return {
      category,
      best: inCategory[0]?.score ?? Infinity,
      items: inCategory.slice(0, perCategory).map((match) => match.item),
    };
  })
    .filter((group) => group.items.length > 0)
    .sort(
      (a, b) => a.best - b.best || CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category),
    );

  let room = MAX_SUGGESTIONS;
  const capped: SearchGroup[] = [];
  for (const group of groups) {
    if (room <= 0) break;
    capped.push({ category: group.category, items: group.items.slice(0, room) });
    room -= group.items.length;
  }
  return capped;
}
