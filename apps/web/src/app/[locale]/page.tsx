import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { resolveLocale } from '@/i18n/locale';
import { buildAlternates } from '@/i18n/metadata';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  return { alternates: buildAlternates(locale, '/') };
}

/** Portada (Noticias): por ahora presentación e información; las noticias llegan en la spec 004. */
export default async function HomePage({ params }: Props) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('home');

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-8 md:pt-20">
        <p className="text-sm font-semibold tracking-wide text-link uppercase">{t('eyebrow')}</p>
        <h1 className="mt-3 font-display text-5xl font-bold tracking-tight md:text-7xl">
          {t('title')}
        </h1>
        <p className="mt-5 max-w-2xl text-xl text-muted">{t('tagline')}</p>
      </section>

      <section className="mx-auto max-w-6xl px-4" aria-labelledby="info-app">
        <div className="rounded-xl border border-line bg-surface p-6 md:p-8">
          <h2 id="info-app" className="font-display text-xl font-semibold">
            {t('infoTitle')}
          </h2>
          <p className="mt-2 max-w-3xl text-muted">{t('infoBody')}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="noticias">
        <h2 id="noticias" className="font-display text-3xl font-bold">
          {t('newsTitle')}
        </h2>
        <p className="mt-3 text-muted">{t('newsEmpty')}</p>
      </section>
    </>
  );
}
