'use client';

import { CircleUserRound, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { Link } from '@/i18n/navigation';
import { useAccountMenuViewModel } from '../viewmodel/useAccountMenuViewModel';
import { ACCOUNT_BUTTON as BUTTON, SignInLink } from './SignInLink';

/**
 * Menú de cuenta del encabezado (US1, US2). Lo carga `AccountEntry` solo con indicador de sesión.
 * Mientras confirma la sesión, o si venció, muestra «Entrar». Con sesión muestra el nombre y un menú
 * con «Mi cuenta» y el formulario de «Cerrar sesión» (POST, mismo origen).
 */
export function AccountMenu() {
  const t = useTranslations('account');
  const vm = useAccountMenuViewModel();
  const rootRef = useRef<HTMLDivElement>(null);
  const { open, close } = vm;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  if (vm.status !== 'signed-in') {
    return <SignInLink href={vm.signInHref} label={t('signIn')} busy={vm.status === 'loading'} />;
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          close();
          rootRef.current?.querySelector('button')?.focus();
        }
      }}
    >
      <button
        type="button"
        onClick={vm.toggle}
        aria-expanded={open}
        aria-controls="menu-cuenta"
        aria-label={t('menuLabel', { name: vm.name })}
        className={BUTTON}
      >
        <span
          aria-hidden="true"
          className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
        >
          {vm.initial || <CircleUserRound className="size-5" />}
        </span>
        <span className="hidden max-w-32 truncate md:inline">{vm.name}</span>
      </button>
      {open ? (
        <div
          id="menu-cuenta"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-line bg-background p-2 shadow-lg"
        >
          <p className="truncate px-3 py-2 text-sm text-muted">{vm.name}</p>
          <Link
            href="/cuenta"
            onClick={close}
            className="flex min-h-11 items-center rounded-md px-3 text-sm font-semibold hover:bg-surface"
          >
            {t('myAccount')}
          </Link>
          <form method="post" action={vm.signOutAction}>
            <button
              type="submit"
              className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-semibold hover:bg-surface"
            >
              <LogOut aria-hidden="true" className="size-4" />
              {t('signOut')}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
