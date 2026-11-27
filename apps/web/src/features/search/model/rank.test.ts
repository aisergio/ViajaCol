import type { SearchItem } from '@viajacol/content/search-types';
import { describe, expect, it } from 'vitest';
import { MAX_PER_CATEGORY, MAX_SUGGESTIONS, rankSearchResults } from './rank';

const items: SearchItem[] = [
  { c: 'sitios', s: 'monserrate', n: 'Monserrate', r: 'Andina', p: 'Bogotá D. C.' },
  { c: 'sitios', s: 'plaza-de-bolivar', n: 'Plaza de Bolívar', r: 'Andina', p: 'Bogotá D. C.' },
  {
    c: 'fiestas',
    s: 'barranquilla',
    n: 'Carnaval de Barranquilla',
    r: 'Caribe',
    p: 'Barranquilla, Atlántico',
  },
  { c: 'fiestas', s: 'pasto', n: 'Carnaval de Negros y Blancos', r: 'Andina', p: 'Pasto, Nariño' },
  { c: 'platos', s: 'ajiaco', n: 'Ajiaco santafereño', r: 'Andina', p: 'Bogotá' },
  { c: 'regiones', s: 'caribe', n: 'Caribe', r: '', p: '' },
];

const slugs = (query: string) =>
  rankSearchResults(items, query).flatMap((group) => group.items.map((item) => item.s));

describe('rankSearchResults (US4)', () => {
  it('sin texto no sugiere nada', () => {
    expect(rankSearchResults(items, '   ')).toEqual([]);
  });

  it('no distingue tildes ni mayúsculas', () => {
    expect(slugs('BOLIVAR')).toEqual(['plaza-de-bolivar']);
    expect(slugs('santafereno')).toEqual(['ajiaco']);
  });

  it('pone primero el nombre que empieza por el texto', () => {
    const groups = rankSearchResults(items, 'carnaval');
    expect(groups).toHaveLength(1);
    expect(groups[0]!.category).toBe('fiestas');
    expect(groups[0]!.items.map((item) => item.s)).toEqual(['barranquilla', 'pasto']);
  });

  it('encuentra por lugar y región, con menor prioridad que por nombre', () => {
    expect(slugs('bogota')).toEqual(['monserrate', 'plaza-de-bolivar', 'ajiaco']);
    const groups = rankSearchResults(items, 'caribe');
    expect(groups[0]!.category).toBe('regiones');
    expect(groups.map((group) => group.category)).toEqual(['regiones', 'fiestas']);
  });

  it('exige todas las palabras', () => {
    expect(slugs('carnaval pasto')).toEqual(['pasto']);
    expect(slugs('carnaval medellin')).toEqual([]);
  });

  it('limita las sugerencias por categoría', () => {
    const many: SearchItem[] = Array.from({ length: 10 }, (_, i) => ({
      c: 'sitios',
      s: `sitio-${i}`,
      n: `Sitio ${i}`,
      r: 'Andina',
      p: '',
    }));
    expect(rankSearchResults(many, 'sitio', 3)[0]!.items).toHaveLength(3);
    expect(rankSearchResults(many, 'sitio')[0]!.items).toHaveLength(MAX_PER_CATEGORY);
  });

  it('con una sola letra no sugiere nada: no alcanza para elegir (SC-004)', () => {
    expect(rankSearchResults(items, 'c')).toEqual([]);
    expect(rankSearchResults(items, ' c ')).toEqual([]);
    expect(slugs('ca').length).toBeGreaterThan(0);
  });

  it('entrega como máximo 12 sugerencias en total, de los grupos con mejores coincidencias', () => {
    const categories = ['sitios', 'fiestas', 'platos', 'experiencias'] as const;
    const many: SearchItem[] = categories.flatMap((c) =>
      Array.from({ length: 6 }, (_, i) => ({
        c,
        s: `${c}-${i}`,
        n: `Andes ${c} ${i}`,
        r: '',
        p: '',
      })),
    );
    const groups = rankSearchResults(many, 'andes');
    const total = groups.reduce((sum, group) => sum + group.items.length, 0);
    expect(total).toBe(MAX_SUGGESTIONS);
    expect(groups.map((group) => group.category)).toEqual(['sitios', 'fiestas', 'platos']);
  });
});
