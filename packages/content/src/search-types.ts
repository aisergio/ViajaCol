import type { Category, Locale } from './constants';

/**
 * Entrada del índice de búsqueda (contrato `contracts/search-index.md`). Las claves son cortas para
 * que el índice pese poco. Este archivo no importa datos: el cliente puede usar sus tipos sin cargar
 * el catálogo.
 */
export type SearchItem = {
  /** Categoría, que también es el segmento de ruta. */
  c: Category;
  /** Slug. */
  s: string;
  /** Nombre en el idioma del índice. */
  n: string;
  /** Nombre de la región en el idioma (vacío en las regiones). */
  r: string;
  /** Lugar: municipio y departamento, u origen del plato. */
  p: string;
};

export type SearchIndex = {
  v: 1;
  locale: Locale;
  items: SearchItem[];
};
