import { getCredits } from '@viajacol/content';
import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DeferredPhoto } from '@/components/catalog/DeferredPhoto';
import { PageTransition } from '@/components/catalog/PageTransition';
import { SectionIntro } from '@/components/layout/SectionIntro';
import { resolveLocale } from '@/i18n/locale';
import { buildAlternates } from '@/i18n/metadata';
import { Link } from '@/i18n/navigation';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'sections.creditos' });
  return {
    title: t('title'),
    description: t('intro'),
    alternates: buildAlternates(locale, '/creditos'),
  };
}

/** Créditos de todas las fotos publicadas (US6, FR-013). */
export default async function CreditsPage({ params }: Props) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('sections.creditos');
  const tCredits = await getTranslations('credits');
  const tCatalog = await getTranslations('catalog');
  const credits = getCredits(locale);
  // Objetivos de al menos 24 px de alto (WCAG 2.2, 2.5.8): aquí los enlaces no van dentro de una frase.
  const link =
    'inline-flex min-h-6 items-center underline underline-offset-2 hover:text-foreground';

  return (
    <PageTransition>
      <SectionIntro title={t('title')} intro={t('intro')} />
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-sm text-muted">
          {tCredits('count', { count: credits.length })} · {tCredits('resized')}
        </p>
        <ul role="list" className="mt-6 grid gap-4 md:grid-cols-2">
          {credits.map((credit) => (
            <li
              key={`${credit.category}/${credit.slug}`}
              className="flex gap-4 rounded-xl border border-line bg-surface p-3"
            >
              <div className="size-24 shrink-0 overflow-hidden rounded-lg bg-line">
                {/* 96 miniaturas: cada una se monta al acercarse a la pantalla. */}
                <DeferredPhoto alt="" blur={credit.photo.blur}>
                  <Image
                    src={credit.photo.src}
                    alt=""
                    width={credit.photo.width}
                    height={credit.photo.height}
                    sizes="96px"
                    className="size-full object-cover"
                  />
                </DeferredPhoto>
              </div>
              <div className="min-w-0 text-sm">
                <p className="text-xs font-semibold tracking-wide text-link uppercase">
                  {tCatalog(`category.${credit.category}`)}
                </p>
                <p className="font-semibold">
                  <Link
                    href={`/${credit.category}/${credit.slug}`}
                    className="inline-flex min-h-6 items-center hover:underline"
                  >
                    {credit.name}
                  </Link>
                </p>
                <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 text-muted">
                  <dt>{tCredits('author')}:</dt>
                  <dd className="truncate">{credit.photo.credit.author}</dd>
                  <dt>{tCredits('license')}:</dt>
                  <dd>
                    {credit.photo.credit.licenseUrl ? (
                      <a
                        href={credit.photo.credit.licenseUrl}
                        rel="license noopener noreferrer"
                        className={link}
                      >
                        {credit.photo.credit.license}
                      </a>
                    ) : (
                      credit.photo.credit.license
                    )}
                  </dd>
                  <dt>{tCredits('source')}:</dt>
                  <dd>
                    <a
                      href={credit.photo.credit.page}
                      rel="noopener noreferrer"
                      aria-label={tCatalog('photoSource', { name: credit.name })}
                      className={link}
                    >
                      Wikimedia Commons
                    </a>
                  </dd>
                </dl>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </PageTransition>
  );
}
