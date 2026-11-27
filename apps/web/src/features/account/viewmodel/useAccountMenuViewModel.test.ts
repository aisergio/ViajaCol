import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccountStore } from '../model/accountStore';
import * as session from '../model/session';
import { useAccountMenuViewModel } from './useAccountMenuViewModel';

vi.mock('next-intl', () => ({ useLocale: () => 'es' }));
vi.mock('next/navigation', () => ({ usePathname: () => '/sitios' }));

function setCookie(value: string) {
  Object.defineProperty(document, 'cookie', { configurable: true, get: () => value, set: () => undefined });
}

describe('useAccountMenuViewModel', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/ViajaCol/sitios?region=caribe');
    useAccountStore.getState().signOut();
  });
  afterEach(() => vi.restoreAllMocks());

  it('sin indicador muestra «Entrar» y no hace peticiones', async () => {
    setCookie('tema=oscuro');
    const fetchName = vi.spyOn(session, 'fetchAccountName');
    const { result } = renderHook(() => useAccountMenuViewModel());
    await waitFor(() => expect(result.current.signInHref).toContain('volver='));
    expect(result.current.status).toBe('anonymous');
    expect(result.current.signInHref).toBe('/ViajaCol/entrar?volver=%2FViajaCol%2Fsitios');
    expect(fetchName).not.toHaveBeenCalled();
  });

  it('con indicador pide el nombre y muestra el menú', async () => {
    setCookie('viajacol.con_sesion=1');
    vi.spyOn(session, 'fetchAccountName').mockResolvedValue({ status: 'ok', name: 'ana' });
    const { result } = renderHook(() => useAccountMenuViewModel());
    await waitFor(() => expect(result.current.status).toBe('signed-in'));
    expect(result.current.name).toBe('ana');
    expect(result.current.initial).toBe('A');
    expect(result.current.signOutAction).toBe('/ViajaCol/salir');
  });

  it('un 401 borra el indicador y vuelve a «Entrar»', async () => {
    setCookie('viajacol.con_sesion=1');
    vi.spyOn(session, 'fetchAccountName').mockResolvedValue({ status: 'anonymous' });
    const clear = vi.spyOn(session, 'clearSessionHint').mockImplementation(() => undefined);
    const { result } = renderHook(() => useAccountMenuViewModel());
    await waitFor(() => expect(clear).toHaveBeenCalledOnce());
    expect(result.current.status).toBe('anonymous');
  });

  it('un error de red no borra el indicador', async () => {
    setCookie('viajacol.con_sesion=1');
    vi.spyOn(session, 'fetchAccountName').mockResolvedValue({ status: 'error' });
    const clear = vi.spyOn(session, 'clearSessionHint');
    const { result } = renderHook(() => useAccountMenuViewModel());
    await waitFor(() => expect(result.current.status).toBe('anonymous'));
    expect(clear).not.toHaveBeenCalled();
  });

  it('un nombre cambiado en «Mi cuenta» llega al menú por el store compartido', async () => {
    setCookie('viajacol.con_sesion=1');
    vi.spyOn(session, 'fetchAccountName').mockResolvedValue({ status: 'ok', name: 'ana' });
    const { result } = renderHook(() => useAccountMenuViewModel());
    await waitFor(() => expect(result.current.status).toBe('signed-in'));
    act(() => useAccountStore.getState().rename('Ana María'));
    expect(result.current.name).toBe('Ana María');
  });

  it('abre y cierra el menú', async () => {
    setCookie('');
    const { result } = renderHook(() => useAccountMenuViewModel());
    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);
    act(() => result.current.close());
    expect(result.current.open).toBe(false);
  });
});
