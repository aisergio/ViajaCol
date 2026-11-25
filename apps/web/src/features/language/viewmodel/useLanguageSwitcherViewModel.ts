'use client';

import { useLocale, type Locale } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

export type LanguageOption = { code: Locale; href: string; isCurrent: boolean };

/**
 * ViewModel del selector de idioma. El idioma vive en la URL (estado global por ruta):
 * cada opción apunta a la misma ruta en el otro idioma.
 */
export function useLanguageSwitcherViewModel(): { locale: Locale; options: LanguageOption[] } {
  const locale = useLocale();
  const pathname = usePathname();
  const options = routing.locales.map((code) => ({
    code,
    href: pathname,
    isCurrent: code === locale,
  }));
  return { locale, options };
}
