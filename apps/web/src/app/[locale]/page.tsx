import { getCards, getDetail, getFeatured, REGION_CATEGORIES } from '@viajacol/content';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CatalogGrid } from '@/components/catalog/CatalogGrid';
import { CatalogPhoto } from '@/components/catalog/CatalogPhoto';
import { PageTransition } from '@/components/catalog/PageTransition';
import { PhotoCredit } from '@/components/catalog/PhotoCredit';
import { resolveLocale } from '@/i18n/locale';
import { buildAlternates } from '@/i18n/metadata';
import { Link } from '@/i18n/navigation';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  return { alternates: buildAlternates(locale, '/') };
}

/** Foto de la portada: el valle de Cocora, con la palma de cera, el árbol nacional. */
const HERO = { category: 'sitios', slug: 'valle-de-cocora' } as const;

/**
 * Secciones bajo el primer pantallazo: el navegador no las maqueta ni las pinta hasta que se acercan
 * (spec 004, D-11). La altura reservada se ajusta sola a la real una vez que se dibujan (`auto`).
 */
const BELOW_FOLD = '[content-visibility:auto] [contain-intrinsic-size:auto_900px]';

/**
 * Portada (US5): presentación, accesos a las seis regiones, destacados por categoría y noticias.
 * La versión personalizada, con streaming, llega con la spec 010.
 */
export default async function HomePage({ params }: Props) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const tSections = await getTranslations('sections');
  const hero = getDetail(HERO.category, HERO.slug, locale);
  const regions = getCards('regiones', locale);
  const featured = getFeatured(locale);
  const button =
    'inline-flex min-h-11 items-center rounded-md px-5 text-sm font-semibold transition-opacity hover:opacity-90';

  return (
    <PageTransition>
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pt-10 pb-8 md:grid-cols-2 md:pt-16">
        <div>
          <p className="text-sm font-semibold tracking-wide text-link uppercase">{t('eyebrow')}</p>
          <h1 className="mt-3 font-display text-5xl font-bold tracking-tight md:text-7xl">
            {t('title')}
          </h1>
          <p className="mt-5 max-w-xl text-xl text-muted">{t('tagline')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/sitios" className={`${button} bg-primary text-primary-foreground`}>
              {t('ctaPrimary')}
            </Link>
            <Link
              href="/fiestas"
              className={`${button} border border-line bg-surface text-foreground`}
            >
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>
        {hero?.photo ? (
          <figure>
            <div className="aspect-4/3 overflow-hidden rounded-xl bg-line shadow-xl">
              {/*
               * En teléfonos (hasta 2×) se pide la variante de 480 px (25 KB y no 88 KB): es la
               * foto LCP de la portada y comparte la red con el JavaScript inicial (research D-11).
               */}
              <CatalogPhoto
                photo={hero.photo}
                sizes="(min-width: 1152px) 560px, (min-width: 768px) 50vw, 240px"
                priority
                fallbackLabel={hero.name}
              />
            </div>
            <figcaption className="mt-2">
              <PhotoCredit credit={hero.photo.credit} name={hero.name} />
            </figcaption>
          </figure>
        ) : null}
      </section>

      <section aria-labelledby="regiones" className={`${BELOW_FOLD} mx-auto max-w-6xl px-4 py-10`}>
        <h2 id="regiones" className="font-display text-3xl font-bold">
          {t('regionsTitle')}
        </h2>
        <p className="mt-2 max-w-2xl text-muted">{t('regionsIntro')}</p>
        <div className="mt-6">
          <CatalogGrid cards={regions} headingLevel="h3" />
        </div>
      </section>

      {REGION_CATEGORIES.map((category) => (
        <section
          key={category}
          aria-labelledby={`destacados-${category}`}
          className={`${BELOW_FOLD} mx-auto max-w-6xl px-4 py-8`}
        >
          <div className="flex items-end justify-between gap-4">
            <h2 id={`destacados-${category}`} className="font-display text-3xl font-bold">
              {tSections(`${category}.title`)}
            </h2>
            <Link
              href={`/${category}`}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-link underline underline-offset-4"
            >
              {t('seeAll')}
              <span className="sr-only">: {tSections(`${category}.title`)}</span>
            </Link>
          </div>
          <div className="mt-6">
            <CatalogGrid cards={featured[category]} headingLevel="h3" />
          </div>
        </section>
      ))}

      <section aria-labelledby="noticias" className={`${BELOW_FOLD} mx-auto max-w-6xl px-4 py-8`}>
        <div className="flex items-end justify-between gap-4">
          <h2 id="noticias" className="font-display text-3xl font-bold">
            {t('newsTitle')}
          </h2>
          <Link
            href="/noticias"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-link underline underline-offset-4"
          >
            {t('seeAll')}
            <span className="sr-only">: {t('newsTitle')}</span>
          </Link>
        </div>
        <div className="mt-6">
          <CatalogGrid cards={featured.noticias} headingLevel="h3" />
        </div>
      </section>
    </PageTransition>
  );
}
