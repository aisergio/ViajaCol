import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function LocaleNotFound() {
  const t = useTranslations('notFound');

  return (
    <section className="mx-auto max-w-3xl px-4 py-20 text-center">
      <p className="font-display text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 font-display text-3xl font-bold">{t('title')}</h1>
      <p className="mt-3 text-muted">{t('body')}</p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-semibold text-primary-foreground"
      >
        {t('back')}
      </Link>
    </section>
  );
}
