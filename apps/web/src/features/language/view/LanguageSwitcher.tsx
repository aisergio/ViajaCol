'use client';

import { cn } from '@viajacol/ui';
import { useTranslations } from 'next-intl';
import { localizedPath } from '@/i18n/metadata';
import { useLanguageSwitcherViewModel } from '../viewmodel/useLanguageSwitcherViewModel';

/**
 * Selector de idioma. Usa enlaces normales (navegación completa): con un enlace del enrutador, ir de
 * `/sitios/x` a `/en/sitios/x` coincide con la ruta interceptada y abriría la ficha en una ventana
 * sobre la página en español (spec 004).
 */
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
        <a
          key={option.code}
          href={localizedPath(option.code, option.href)}
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
        </a>
      ))}
    </div>
  );
}
