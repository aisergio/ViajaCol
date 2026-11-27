import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { TricolorStrip } from './TricolorStrip';

export async function SiteFooter() {
  const t = await getTranslations('footer');
  const link = 'font-semibold text-link underline underline-offset-4';

  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted">
        <p className="font-display text-base font-semibold text-foreground">Viaja Colombia</p>
        <p>{t('project')}</p>
        <p>
          {t('license')} {t('credits')}
        </p>
        <p className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/creditos" className={link}>
            {t('creditsLink')}
          </Link>
          <a
            href="https://github.com/aisergio/ViajaCol"
            className={link}
            rel="noopener noreferrer"
            target="_blank"
          >
            {t('repo')}
          </a>
          <span>{t('guides')}</span>
        </p>
      </div>
      <TricolorStrip />
    </footer>
  );
}
