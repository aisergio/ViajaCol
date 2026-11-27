'use client';

import { useLocale } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from '@/i18n/navigation';
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
  // Ruta sin basePath ni idioma (`/sitios`), igual en el servidor y en el cliente: «Entrar» trae su
  // regreso aun sin JavaScript. El prefijo del idioma se agrega aquí.
  const pathname = usePathname();
  const localePrefix = locale === 'en' ? '/en' : '';
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
    signInHref: signInHref(
      locale,
      `${BASE_PATH}${localePrefix}${pathname === '/' ? '' : pathname}`,
    ),
    signOutAction: accountPaths(locale).signOut,
  };
}
