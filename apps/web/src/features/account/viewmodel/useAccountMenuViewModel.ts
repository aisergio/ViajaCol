'use client';

import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAccountStore } from '../model/accountStore';
import {
  type AccountLocale,
  BASE_PATH,
  accountPaths,
  clearSessionHint,
  fetchAccountName,
  hasSessionHint,
  signInHref,
} from '../model/session';

/**
 * ViewModel del menú de cuenta. Sin indicador de sesión no hace peticiones (las páginas siguen
 * estáticas y los visitantes anónimos no gastan invocaciones). Con indicador, pide el nombre; un 401
 * borra el indicador y vuelve a «Entrar». El nombre vive en el store compartido de la cuenta.
 */
export function useAccountMenuViewModel() {
  const locale = useLocale() as AccountLocale;
  // Sin el basePath y con el prefijo de idioma (`/sitios`, `/en/sitios`); también en el servidor, así
  // que «Entrar» trae su regreso aun sin JavaScript.
  const pathname = usePathname();
  const status = useAccountStore((state) => state.status);
  const name = useAccountStore((state) => state.name);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasSessionHint(document.cookie)) return;
    const store = useAccountStore.getState();
    if (store.status === 'signed-in') return;
    let cancelled = false;
    store.setLoading();
    void fetchAccountName().then((result) => {
      if (cancelled) return;
      if (result.status === 'ok') {
        useAccountStore.getState().signIn(result.name);
        return;
      }
      if (result.status === 'anonymous') clearSessionHint();
      useAccountStore.getState().signOut();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(() => setOpen((value) => !value), []);
  const close = useCallback(() => setOpen(false), []);

  return {
    status,
    name,
    initial: name.trim().charAt(0).toUpperCase(),
    open,
    toggle,
    close,
    signInHref: signInHref(locale, pathname ? `${BASE_PATH}${pathname === '/' ? '' : pathname}` : null),
    signOutAction: accountPaths(locale).signOut,
  };
}
