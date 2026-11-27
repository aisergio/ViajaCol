import type { SearchIndex } from '@viajacol/content/search-types';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchItemHref, useSearchViewModel } from './useSearchViewModel';

const push = vi.fn();
vi.mock('next-intl', () => ({ useLocale: () => 'es' }));
vi.mock('@/i18n/navigation', () => ({ useRouter: () => ({ push }) }));

const index: SearchIndex = {
  v: 1,
  locale: 'es',
  items: [
    { c: 'sitios', s: 'monserrate', n: 'Monserrate', r: 'Andina', p: 'Bogotá D. C.' },
    {
      c: 'fiestas',
      s: 'carnaval-de-barranquilla',
      n: 'Carnaval de Barranquilla',
      r: 'Caribe',
      p: 'Barranquilla, Atlántico',
    },
  ],
};

beforeEach(() => push.mockReset());

describe('useSearchViewModel (US4)', () => {
  it('no descarga el índice hasta que se usa el buscador (FR-008)', () => {
    const loader = vi.fn(async () => index);
    const { result } = renderHook(() => useSearchViewModel(loader));
    expect(loader).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
    expect(result.current.groups).toEqual([]);
  });

  it('carga el índice una vez y sugiere al escribir', async () => {
    const loader = vi.fn(async () => index);
    const { result } = renderHook(() => useSearchViewModel(loader));
    act(() => result.current.load());
    act(() => result.current.load());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(loader).toHaveBeenCalledOnce();
    expect(loader).toHaveBeenCalledWith('es');

    act(() => result.current.setQuery('carnaval'));
    await waitFor(() => expect(result.current.count).toBe(1));
    expect(result.current.groups[0]!.category).toBe('fiestas');
    expect(result.current.isStale).toBe(false);
  });

  it('escribir también dispara la carga', async () => {
    const loader = vi.fn(async () => index);
    const { result } = renderHook(() => useSearchViewModel(loader));
    act(() => result.current.setQuery('mon'));
    await waitFor(() => expect(result.current.count).toBe(1));
    expect(loader).toHaveBeenCalledOnce();
  });

  it('un texto vacío no carga nada', () => {
    const loader = vi.fn(async () => index);
    const { result } = renderHook(() => useSearchViewModel(loader));
    act(() => result.current.setQuery('   '));
    expect(loader).not.toHaveBeenCalled();
  });

  it('con una letra aún no sugiere: la vista muestra la ayuda', async () => {
    const loader = vi.fn(async () => index);
    const { result } = renderHook(() => useSearchViewModel(loader));
    act(() => result.current.setQuery('m'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.searchable).toBe(false);
    expect(result.current.count).toBe(0);
    act(() => result.current.setQuery('mo'));
    expect(result.current.searchable).toBe(true);
  });

  it('el texto del campo simple llega como texto inicial', () => {
    const { result } = renderHook(() =>
      useSearchViewModel(
        vi.fn(async () => index),
        'bogo',
      ),
    );
    expect(result.current.query).toBe('bogo');
  });

  it('si la carga falla, informa el error y permite reintentar', async () => {
    const loader = vi
      .fn<(locale: string) => Promise<SearchIndex>>()
      .mockRejectedValueOnce(new Error('sin conexión'))
      .mockResolvedValueOnce(index);
    const { result } = renderHook(() => useSearchViewModel(loader));
    act(() => result.current.load());
    await waitFor(() => expect(result.current.status).toBe('error'));
    act(() => result.current.load());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('abrir una sugerencia navega a la ficha y limpia el texto', async () => {
    const loader = vi.fn(async () => index);
    const { result } = renderHook(() => useSearchViewModel(loader));
    act(() => result.current.setQuery('monserrate'));
    await waitFor(() => expect(result.current.count).toBe(1));
    act(() => result.current.open(result.current.groups[0]!.items[0]!));
    expect(push).toHaveBeenCalledWith('/sitios/monserrate');
    expect(result.current.query).toBe('');
  });

  it('arma la dirección sin idioma', () => {
    expect(searchItemHref(index.items[1]!)).toBe('/fiestas/carnaval-de-barranquilla');
  });
});
