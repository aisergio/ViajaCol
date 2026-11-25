'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

type Props = { error: Error & { digest?: string }; reset: () => void };

/** Límite de error por sección: mensaje amable, sin detalles técnicos, con opción de reintentar. */
export default function LocaleError({ reset }: Props) {
  const t = useTranslations('error');

  return (
    <section className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="font-display text-3xl font-bold">{t('title')}</h1>
      <p className="mt-3 text-muted">{t('body')}</p>
      <div className="mt-8 flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-semibold text-primary-foreground"
        >
          {t('retry')}
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-md border border-line px-5 font-semibold"
        >
          {t('back')}
        </Link>
      </div>
    </section>
  );
}
