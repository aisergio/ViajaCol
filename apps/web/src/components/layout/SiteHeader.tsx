import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from '@/features/language/view/LanguageSwitcher';
import { MainNav } from '@/features/navigation/view/MainNav';
import { MobileNav } from '@/features/navigation/view/MobileNav';
import { ThemeToggle } from '@/features/theme/view/ThemeToggle';
import { Link } from '@/i18n/navigation';
import { BrandMark } from './BrandMark';

/** Cabecera común (Server Component): solo navegación, idioma, tema y menú móvil son de cliente. */
export async function SiteHeader() {
  const t = await getTranslations('nav');

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/90 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link
          href="/"
          aria-label={t('home')}
          className="flex min-h-11 items-center gap-2 font-display text-lg font-bold text-primary"
        >
          <BrandMark />
          <span>Viaja Colombia</span>
        </Link>
        <MainNav className="ml-4 hidden md:block" />
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
