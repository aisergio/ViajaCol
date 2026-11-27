import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'account.deleted' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

/** Confirmación de que la cuenta se eliminó (US5). Es pública: ya no hay sesión. */
export default async function AccountDeletedPage({ params }: Props) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('account.deleted');

  return (
    <section className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="font-display text-3xl font-bold">{t('title')}</h1>
      <p className="mt-3 text-muted">{t('text')}</p>
      <div className="mt-8 flex justify-center">
        <Link href="/" className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-semibold text-primary-foreground">
          {t('home')}
        </Link>
      </div>
    </section>
  );
}
