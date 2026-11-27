import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { homeFor } from '@/server/auth/return-path';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'account.signInError' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

/** El inicio de sesión no se completó: Cognito no respondió, el usuario canceló o el estado no coincidió. */
export default async function SignInErrorPage({ params }: Props) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('account.signInError');

  return (
    <section className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="font-display text-3xl font-bold">{t('title')}</h1>
      <p className="mt-3 text-muted">{t('text')}</p>
      <div className="mt-8 flex justify-center gap-3">
        <a href={`${homeFor(locale)}/entrar`} className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-semibold text-primary-foreground">
          {t('retry')}
        </a>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-md border border-line px-5 font-semibold">
          {t('home')}
        </Link>
      </div>
    </section>
  );
}
