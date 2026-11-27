import { getTranslations } from 'next-intl/server';
import { AccountMenu } from '@/features/account/view/AccountMenu';
import { LanguageSwitcher } from '@/features/language/view/LanguageSwitcher';
import { MainNav } from '@/features/navigation/view/MainNav';
import { MobileNav } from '@/features/navigation/view/MobileNav';
import { SearchBox } from '@/features/search/view/SearchBox';
import { ThemeToggle } from '@/features/theme/view/ThemeToggle';
import { Link } from '@/i18n/navigation';
import { BrandMark } from './BrandMark';

/**
 * Cabecera común (Server Component). Navegación, buscador, idioma, tema y menú móvil son de cliente.
 * Su `view-transition-name` la deja fija mientras el contenido se desliza (globals.css).
 */
export async function SiteHeader() {
  const t = await getTranslations('nav');

  return (
    <header
      style={{ viewTransitionName: 'site-header' }}
      className="sticky top-0 z-40 border-b border-line bg-background/90 backdrop-blur"
    >
      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-3">
        <Link
          href="/"
          aria-label={t('home')}
          className="flex min-h-11 shrink-0 items-center gap-2 font-display text-lg font-bold text-primary"
        >
          <BrandMark />
          <span className="hidden sm:inline">Viaja Colombia</span>
        </Link>
        <MainNav className="ml-2 hidden xl:block" />
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 xl:flex-none">
          <div className="min-w-0 flex-1 sm:max-w-xs xl:w-60 xl:flex-none">
            <SearchBox />
          </div>
          <LanguageSwitcher />
          <ThemeToggle />
          <AccountMenu />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
