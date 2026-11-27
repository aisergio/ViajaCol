import type { CardItem } from '@viajacol/content';
import { act, renderHook, waitFor } from '@testing-library/react';
import { withNuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';
import { useCatalogFiltersViewModel } from './useCatalogFiltersViewModel';

function card(slug: string, region: CardItem['region'], months: number[] | null = null): CardItem {
  return {
    category: months ? 'fiestas' : 'sitios',
    slug,
    name: slug,
    summary: 'Resumen de prueba para la tarjeta.',
    region,
    regionName: region,
    place: null,
    photo: null,
    months,
    date: null,
  };
}

const cards = [card('a', 'caribe', [2]), card('b', 'andina', [8]), card('c', 'caribe', [11])];

function setup(searchParams = '') {
  const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
  const hook = renderHook(() => useCatalogFiltersViewModel(cards), {
    wrapper: withNuqsTestingAdapter({ searchParams, onUrlUpdate, hasMemory: true }),
  });
  return { ...hook, onUrlUpdate };
}

describe('useCatalogFiltersViewModel (US1)', () => {
  it('lee los filtros de la URL y filtra', () => {
    const { result } = setup('?region=caribe&mes=11');
    expect(result.current.filters).toEqual({ region: 'caribe', month: 11, query: '' });
    expect(result.current.results.map((item) => item.slug)).toEqual(['c']);
    expect(result.current.hasFilters).toBe(true);
    expect(result.current.total).toBe(3);
  });

  it('ignora valores inválidos de la URL', () => {
    const { result } = setup('?region=marte&mes=13');
    expect(result.current.filters).toEqual({ region: null, month: null, query: '' });
    expect(result.current.results).toHaveLength(3);
    expect(result.current.hasFilters).toBe(false);
  });

  it('elegir una región la escribe en la URL con una entrada nueva de historial', async () => {
    const { result, onUrlUpdate } = setup();
    act(() => result.current.setRegion('andina'));
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const event = onUrlUpdate.mock.calls.at(-1)![0];
    expect(event.queryString).toBe('?region=andina');
    expect(event.options.history).toBe('push');
    expect(result.current.results.map((item) => item.slug)).toEqual(['b']);
  });

  it('el texto reemplaza la entrada del historial y se recorta', async () => {
    const { result, onUrlUpdate } = setup();
    act(() => result.current.setQuery('x'.repeat(80)));
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const event = onUrlUpdate.mock.calls.at(-1)![0];
    expect(event.options.history).toBe('replace');
    expect(event.searchParams.get('q')).toHaveLength(60);
  });

  it('el mes y limpiar actualizan la URL', async () => {
    const { result, onUrlUpdate } = setup('?region=caribe');
    act(() => result.current.setMonth(2));
    await waitFor(() => expect(result.current.filters.month).toBe(2));
    expect(result.current.results.map((item) => item.slug)).toEqual(['a']);
    act(() => result.current.clear());
    await waitFor(() => expect(result.current.hasFilters).toBe(false));
    expect(onUrlUpdate.mock.calls.at(-1)![0].queryString).toBe('');
  });

  it('un texto vacío quita el parámetro', async () => {
    const { result, onUrlUpdate } = setup('?q=flores');
    act(() => result.current.setQuery(''));
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(onUrlUpdate.mock.calls.at(-1)![0].searchParams.has('q')).toBe(false);
  });
});
