import type { Credit } from '@viajacol/content';
import { cn } from '@viajacol/ui';
import { useTranslations } from 'next-intl';

type Props = { credit: Credit; name: string; className?: string };

/** Crédito junto a la foto (FR-003): autor, licencia enlazada y fuente en Wikimedia Commons. */
export function PhotoCredit({ credit, name, className }: Props) {
  const t = useTranslations('catalog');
  const link = 'underline underline-offset-2 hover:text-foreground';
  return (
    <p className={cn('text-xs text-muted', className)}>
      {t('photoCredit', { author: credit.author })}
      {' · '}
      {credit.licenseUrl ? (
        <a href={credit.licenseUrl} rel="license noopener noreferrer" className={link}>
          {credit.license}
        </a>
      ) : (
        credit.license
      )}
      {' · '}
      <a
        href={credit.page}
        rel="noopener noreferrer"
        aria-label={t('photoSource', { name })}
        className={link}
      >
        Wikimedia Commons
      </a>
    </p>
  );
}
