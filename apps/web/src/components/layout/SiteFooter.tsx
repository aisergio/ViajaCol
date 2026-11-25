import { getTranslations } from 'next-intl/server';
import { TricolorStrip } from './TricolorStrip';

export async function SiteFooter() {
  const t = await getTranslations('footer');

  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted">
        <p className="font-display text-base font-semibold text-foreground">Viaja Colombia</p>
        <p>{t('project')}</p>
        <p>
          {t('license')} {t('credits')}
        </p>
        <p>
          <a
            href="https://github.com/aisergio/ViajaCol"
            className="font-semibold text-link underline underline-offset-4"
            rel="noopener noreferrer"
            target="_blank"
          >
            {t('repo')}
          </a>
        </p>
      </div>
      <TricolorStrip />
    </footer>
  );
}
