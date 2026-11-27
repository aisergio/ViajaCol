'use client';

import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMobileNavViewModel } from '../viewmodel/useMobileNavViewModel';
import { MainNav } from './MainNav';

export function MobileNav() {
  const t = useTranslations('nav');
  const { open, toggle } = useMobileNavViewModel();

  return (
    <div className="xl:hidden">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="menu-movil"
        aria-label={open ? t('closeMenu') : t('openMenu')}
        className="inline-flex size-11 items-center justify-center rounded-md border border-line hover:bg-surface"
      >
        {open ? (
          <X aria-hidden="true" className="size-5" />
        ) : (
          <Menu aria-hidden="true" className="size-5" />
        )}
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-full border-b border-line bg-background px-4 py-3 shadow-lg">
          <MainNav id="menu-movil" orientation="vertical" />
        </div>
      ) : null}
    </div>
  );
}
