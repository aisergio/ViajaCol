import type { CardItem } from '@viajacol/content';
import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTERS,
  filterCards,
  hasActiveFilters,
  MAX_QUERY_LENGTH,
  normalizeText,
  sanitizeFilters,
} from './filters';

function card(partial: Partial<CardItem> & Pick<CardItem, 'slug' | 'name'>): CardItem {
  return {
    category: 'fiestas',
    summary: 'Resumen de prueba para la tarjeta.',
    region: null,
    regionName: null,
    place: null,
    photo: null,
    months: null,
    date: null,
    ...partial,
  };
}

const cards = [
  card({
    slug: 'barranquilla',
    name: 'Carnaval de Barranquilla',
    region: 'caribe',
    regionName: 'Caribe',
    place: 'Barranquilla, Atlántico',
    months: [2, 3],
  }),
  card({
    slug: 'pasto',
    name: 'Carnaval de Negros y Blancos',
    region: 'andina',
    regionName: 'Andina',
    place: 'Pasto, Nariño',
    months: [1],
  }),
  card({
    slug: 'san-pacho',
    name: 'Fiestas de San Pacho',
    region: 'pacifica',
    regionName: 'Pacífica',
    place: 'Quibdó, Chocó',
    months: [9, 10],
  }),
  card({
    slug: 'flores',
    name: 'Feria de las Flores',
    region: 'andina',
    regionName: 'Andina',
    place: 'Medellín, Antioquia',
    months: [8],
  }),
];

describe('normalizeText', () => {
  it('quita tildes y mayúsculas, y la ñ queda como n', () => {
    expect(normalizeText('  Bogotá D. C. ')).toBe('bogota d. c.');
    expect(normalizeText('Nariño')).toBe('narino');
  });
});

describe('sanitizeFilters (casos borde de la spec)', () => {
  it('acepta valores válidos', () => {
    expect(sanitizeFilters({ region: 'caribe', month: 2, query: 'carnaval' })).toEqual({
      region: 'caribe',
      month: 2,
      query: 'carnaval',
    });
  });

  it.each([
    [{ region: 'marte' }, EMPTY_FILTERS],
    [{ month: 13 }, EMPTY_FILTERS],
    [{ month: 0 }, EMPTY_FILTERS],
    [{ month: 2.5 }, EMPTY_FILTERS],
    [{ region: null, month: null, query: null }, EMPTY_FILTERS],
  ])('ignora %o', (raw, expected) => {
    expect(sanitizeFilters(raw)).toEqual(expected);
  });

  it(`recorta el texto a ${MAX_QUERY_LENGTH} caracteres`, () => {
    expect(sanitizeFilters({ query: 'x'.repeat(100) }).query).toHaveLength(MAX_QUERY_LENGTH);
  });
});

describe('filterCards', () => {
  const slugs = (result: ReturnType<typeof filterCards>) => result.map((item) => item.slug);

  it('sin filtros devuelve todo, en el mismo orden', () => {
    expect(slugs(filterCards(cards, EMPTY_FILTERS))).toEqual([
      'barranquilla',
      'pasto',
      'san-pacho',
      'flores',
    ]);
  });

  it('filtra por región', () => {
    expect(slugs(filterCards(cards, { ...EMPTY_FILTERS, region: 'andina' }))).toEqual([
      'pasto',
      'flores',
    ]);
  });

  it('filtra por mes e incluye las fiestas de varios meses', () => {
    expect(slugs(filterCards(cards, { ...EMPTY_FILTERS, month: 3 }))).toEqual(['barranquilla']);
    expect(slugs(filterCards(cards, { ...EMPTY_FILTERS, month: 10 }))).toEqual(['san-pacho']);
  });

  it('busca sin importar tildes, en el nombre, el lugar y la región', () => {
    expect(slugs(filterCards(cards, { ...EMPTY_FILTERS, query: 'medellin' }))).toEqual(['flores']);
    expect(slugs(filterCards(cards, { ...EMPTY_FILTERS, query: 'QUIBDÓ' }))).toEqual(['san-pacho']);
    expect(slugs(filterCards(cards, { ...EMPTY_FILTERS, query: 'pacifica' }))).toEqual([
      'san-pacho',
    ]);
  });

  it('exige todas las palabras del texto', () => {
    expect(slugs(filterCards(cards, { ...EMPTY_FILTERS, query: 'carnaval pasto' }))).toEqual([
      'pasto',
    ]);
  });

  it('combina los filtros con «y» y puede no dejar nada', () => {
    expect(filterCards(cards, { region: 'caribe', month: 8, query: '' })).toEqual([]);
  });

  it('las fichas sin meses no pasan un filtro de mes', () => {
    const site = card({ slug: 'monserrate', name: 'Monserrate', category: 'sitios' });
    expect(filterCards([site], { ...EMPTY_FILTERS, month: 1 })).toEqual([]);
  });
});

describe('hasActiveFilters', () => {
  it('detecta cualquier filtro activo, pero no un texto de solo espacios', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: '   ' })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, month: 5 })).toBe(true);
  });
});
