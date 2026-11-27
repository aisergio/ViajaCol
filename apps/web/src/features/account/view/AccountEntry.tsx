'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Suspense, lazy, useSyncExternalStore } from 'react';
import { usePathname } from '@/i18n/navigation';
import { type AccountLocale, currentSignInHref, hasSessionHint } from '../model/session';
import { SignInLink } from './SignInLink';

// El menú completo (store, nombre, «Mi cuenta» y «Cerrar sesión») solo se descarga con indicador de
// sesión: la mayoría de las visitas son anónimas y para ellas basta el enlace.
const AccountMenu = lazy(() =>
  import('./AccountMenu').then((module) => ({ default: module.AccountMenu })),
);

// La cookie indicadora no avisa cuando cambia; el menú se ocupa de sus cambios una vez cargado.
const subscribe = () => () => undefined;
const readHint = () => hasSessionHint(document.cookie);
const serverHint = () => false;

/**
 * Entrada de la cuenta en el encabezado. En el servidor y sin sesión es «Entrar»; con el indicador de
 * sesión, después de hidratar, carga el menú y mientras tanto muestra el mismo enlace (sin saltos).
 */
export function AccountEntry() {
  const t = useTranslations('account');
  const locale = useLocale() as AccountLocale;
  const pathname = usePathname();
  const hinted = useSyncExternalStore(subscribe, readHint, serverHint);
  const link = (
    <SignInLink href={currentSignInHref(locale, pathname)} label={t('signIn')} busy={hinted} />
  );

  if (!hinted) return link;
  return (
    <Suspense fallback={link}>
      <AccountMenu />
    </Suspense>
  );
}
