'use client';

import { cn } from '@viajacol/ui';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useLanguageSwitcherViewModel } from '../viewmodel/useLanguageSwitcherViewModel';

export function LanguageSwitcher() {
  const t = useTranslations('language');
  const { options } = useLanguageSwitcherViewModel();

  return (
    <div
      role="group"
      aria-label={t('label')}
      className="inline-flex rounded-md border border-line p-0.5"
    >
      {options.map((option) => (
        <Link
          key={option.code}
          href={option.href}
          locale={option.code}
          hrefLang={option.code}
          lang={option.code}
          aria-current={option.isCurrent ? 'true' : undefined}
          className={cn(
            'inline-flex min-h-10 min-w-11 items-center justify-center rounded-sm px-2 text-sm font-semibold',
            option.isCurrent
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground hover:bg-surface',
          )}
        >
          {/* El nombre accesible contiene el texto visible (WCAG 2.5.3): «EN · English». */}
          {option.code.toUpperCase()}
          <span className="sr-only"> · {t(option.code)}</span>
        </Link>
      ))}
    </div>
  );
}
