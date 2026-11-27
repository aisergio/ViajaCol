import { useTranslations } from 'next-intl';

/** Marca de las noticias de demostración (FR-012). */
export function DemoBadge() {
  const t = useTranslations('catalog');
  return (
    <span className="inline-flex items-center rounded-full bg-highlight px-2.5 py-0.5 text-xs font-bold text-highlight-foreground">
      {t('demo')}
    </span>
  );
}
