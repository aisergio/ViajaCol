import experienciasData from '../data/experiencias.json';
import fiestasData from '../data/fiestas.json';
import mediaData from '../data/media.json';
import noticiasData from '../data/noticias.json';
import platosData from '../data/platos.json';
import regionesData from '../data/regiones.json';
import sitiosData from '../data/sitios.json';
import {
  mediaKey,
  type Category,
  type EntryByCategory,
  type Locale,
  type MediaEntry,
  type RegionSlug,
} from './schema';

export * from './schema';
export type { SearchIndex, SearchItem } from './search-types';

type Catalog = { readonly [C in Category]: readonly EntryByCategory[C][] };

/**
 * El catálogo tal como está en `data/`. Los esquemas lo validan en las pruebas (FR-016); aquí solo se
 * tipa, para no repetir la validación en cada build.
 */
export const catalog: Catalog = {
  regiones: regionesData as unknown as EntryByCategory['regiones'][],
  sitios: sitiosData as unknown as EntryByCategory['sitios'][],
  fiestas: fiestasData as unknown as EntryByCategory['fiestas'][],
  platos: platosData as unknown as EntryByCategory['platos'][],
  experiencias: experienciasData as unknown as EntryByCategory['experiencias'][],
  noticias: noticiasData as unknown as EntryByCategory['noticias'][],
};

/** Manifiesto de fotos que genera `scripts/content/fetch-commons-images.ts`. */
export const media = mediaData as unknown as Readonly<Record<string, MediaEntry>>;

/** Categorías con fichas de lugar o cosa (las que se listan en una región). */
export const REGION_CATEGORIES = ['sitios', 'fiestas', 'platos', 'experiencias'] as const;
export type RegionCategory = (typeof REGION_CATEGORIES)[number];

export type Credit = { author: string; license: string; licenseUrl: string; page: string };

export type Photo = {
  /** Base sin ancho ni extensión: `media/<categoria>/<slug>-<hash>` (lo completa el cargador). */
  src: string;
  width: number;
  height: number;
  blur: string;
  alt: string;
  credit: Credit;
};

/** Lo que necesita una tarjeta. Es serializable: viaja como prop a los componentes de cliente. */
export type CardItem = {
  category: Category;
  slug: string;
  name: string;
  summary: string;
  region: RegionSlug | null;
  regionName: string | null;
  place: string | null;
  photo: Photo | null;
  /** Solo fiestas. */
  months: number[] | null;
  /** Solo noticias (fecha ISO). */
  date: string | null;
};

export type DetailItem = CardItem & {
  body: string[];
  kind: string | null;
  when: string | null;
  unesco: boolean;
  origin: string | null;
  ingredients: string[];
  season: string | null;
  duration: string | null;
  departments: string[];
  coords: [number, number] | null;
  demo: boolean;
};

type AnyEntry = EntryByCategory[Category];

function entries(category: Category): readonly AnyEntry[] {
  return catalog[category];
}

/** «Bogotá, Bogotá D. C.» → «Bogotá D. C.»; «Salento, Quindío» se queda igual. */
export function formatPlace(municipality: string, department: string): string {
  return department.startsWith(municipality) ? department : `${municipality}, ${department}`;
}

export function getRegionName(region: RegionSlug, locale: Locale): string {
  const entry = catalog.regiones.find((item) => item.slug === region);
  return entry ? entry[locale].name : region;
}

export function getPhoto(category: Category, slug: string, alt: string): Photo | null {
  const entry = media[mediaKey(category, slug)];
  if (!entry) return null;
  return {
    src: `media/${category}/${slug}-${entry.hash}`,
    width: entry.width,
    height: entry.height,
    blur: entry.blur,
    alt,
    credit: {
      author: entry.author,
      license: entry.license,
      licenseUrl: entry.licenseUrl,
      page: entry.page,
    },
  };
}

function regionOf(entry: AnyEntry, category: Category): RegionSlug | null {
  if (category === 'regiones') return null;
  return 'region' in entry && entry.region ? entry.region : null;
}

function placeOf(entry: AnyEntry, locale: Locale): string | null {
  if ('municipality' in entry && 'department' in entry) {
    return formatPlace(entry.municipality, entry.department);
  }
  const text = entry[locale];
  if ('origin' in text) return text.origin;
  return null;
}

function toCard(category: Category, entry: AnyEntry, locale: Locale): CardItem {
  const text = entry[locale];
  const region = regionOf(entry, category);
  return {
    category,
    slug: entry.slug,
    name: text.name,
    summary: text.summary,
    region,
    regionName: region ? getRegionName(region, locale) : null,
    place: placeOf(entry, locale),
    photo: getPhoto(category, entry.slug, text.alt),
    months: 'months' in entry ? [...entry.months] : null,
    date: 'date' in entry ? entry.date : null,
  };
}

function toDetail(category: Category, entry: AnyEntry, locale: Locale): DetailItem {
  const text = entry[locale];
  return {
    ...toCard(category, entry, locale),
    body: [...text.body],
    kind: 'kind' in entry ? entry.kind : null,
    when: 'when' in text ? text.when : null,
    unesco: 'unesco' in entry ? Boolean(entry.unesco) : false,
    origin: 'origin' in text ? text.origin : null,
    ingredients: 'ingredients' in text ? [...text.ingredients] : [],
    season: 'season' in text ? text.season : null,
    duration: 'duration' in text ? text.duration : null,
    departments: 'departments' in entry ? [...entry.departments] : [],
    coords: 'coords' in entry ? [entry.coords[0], entry.coords[1]] : null,
    demo: 'demo' in entry ? entry.demo : false,
  };
}

/** Fichas de una categoría, en el orden del archivo (las noticias, de la más reciente a la más vieja). */
export function getCards(category: Category, locale: Locale): CardItem[] {
  const cards = entries(category).map((entry) => toCard(category, entry, locale));
  if (category === 'noticias') cards.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  return cards;
}

export function getDetail(category: Category, slug: string, locale: Locale): DetailItem | null {
  const entry = entries(category).find((item) => item.slug === slug);
  return entry ? toDetail(category, entry, locale) : null;
}

export function getSlugs(category: Category): string[] {
  return entries(category).map((entry) => entry.slug);
}

/** Fichas de una región, por categoría. */
export function getRegionCards(
  region: RegionSlug,
  locale: Locale,
): Record<RegionCategory, CardItem[]> {
  const result = {} as Record<RegionCategory, CardItem[]>;
  for (const category of REGION_CATEGORIES) {
    result[category] = getCards(category, locale).filter((card) => card.region === region);
  }
  return result;
}

/**
 * Hasta `limit` fichas de la misma región, de cualquier categoría con región. El punto de partida
 * depende del slug, así que es estable entre builds pero varía entre fichas.
 */
export function getRelated(
  category: Category,
  slug: string,
  locale: Locale,
  limit = 3,
): CardItem[] {
  const current = getDetail(category, slug, locale);
  if (!current?.region) return [];
  const candidates = REGION_CATEGORIES.flatMap((other) =>
    getCards(other, locale).filter(
      (card) => card.region === current.region && !(other === category && card.slug === slug),
    ),
  );
  if (candidates.length <= limit) return candidates;
  const offset = [...slug].reduce((sum, char) => sum + char.charCodeAt(0), 0) % candidates.length;
  return Array.from({ length: limit }, (_, i) => candidates[(offset + i) % candidates.length]!);
}

/** Destacados de la portada: las tres primeras fichas de cada categoría y las tres noticias más recientes. */
export function getFeatured(locale: Locale): Record<RegionCategory | 'noticias', CardItem[]> {
  return {
    sitios: getCards('sitios', locale).slice(0, 3),
    fiestas: getCards('fiestas', locale).slice(0, 3),
    platos: getCards('platos', locale).slice(0, 3),
    experiencias: getCards('experiencias', locale).slice(0, 3),
    noticias: getCards('noticias', locale).slice(0, 3),
  };
}

export type CreditItem = {
  category: Category;
  slug: string;
  name: string;
  file: string;
  photo: Photo;
};

/** Todas las fotos publicadas, por categoría y nombre (página de créditos, FR-013). */
export function getCredits(locale: Locale): CreditItem[] {
  const collator = new Intl.Collator(locale);
  const items: CreditItem[] = [];
  for (const category of Object.keys(catalog) as Category[]) {
    for (const entry of entries(category)) {
      const text = entry[locale];
      const photo = getPhoto(category, entry.slug, text.alt);
      const file = media[mediaKey(category, entry.slug)]?.file;
      if (photo && file) items.push({ category, slug: entry.slug, name: text.name, file, photo });
    }
  }
  return items.sort(
    (a, b) => a.category.localeCompare(b.category) || collator.compare(a.name, b.name),
  );
}
