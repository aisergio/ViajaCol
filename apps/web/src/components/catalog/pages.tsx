import {
  getCards,
  getDetail,
  getRegionCards,
  getRegionName,
  getRelated,
  getSlugs,
  REGION_CATEGORIES,
  REGION_SLUGS,
  type Category,
  type RegionSlug,
} from '@viajacol/content';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { SectionIntro } from '@/components/layout/SectionIntro';
import { FilterableCatalog } from '@/features/catalog-filters/view/FilterableCatalog';
import { resolveLocale } from '@/i18n/locale';
import { buildAlternates } from '@/i18n/metadata';
import { Link } from '@/i18n/navigation';
import { CatalogGrid } from './CatalogGrid';
import { DetailContent } from './DetailContent';
import { OG_SIZE, ogImagePath } from './og-path';
import { PageTransition } from './PageTransition';

export type LocaleProps = { params: Promise<{ locale: string }> };
export type SlugProps = { params: Promise<{ locale: string; slug: string }> };

const FILTERABLE: readonly Category[] = ['sitios', 'fiestas', 'platos', 'experiencias'];

/** Parámetros estáticos de las fichas de una categoría; el idioma lo da `[locale]/layout`. */
export function detailParams(category: Category): Array<{ slug: string }> {
  return getSlugs(category).map((slug) => ({ slug }));
}

export async function listMetadata(category: Category, { params }: LocaleProps): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'sections' });
  return {
    title: t(`${category}.title`),
    description: t(`${category}.intro`),
    alternates: buildAlternates(locale, `/${category}`),
  };
}

/** Lista de una categoría (US1). Las cuatro listas con región se filtran en el cliente (D-06). */
export async function ListPage({ category, params }: { category: Category } & LocaleProps) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('sections');
  const cards = getCards(category, locale);
  const regions = REGION_SLUGS.map((slug) => ({ slug, name: getRegionName(slug, locale) }));
  const withMonth = category === 'fiestas';

  return (
    <PageTransition>
      <SectionIntro title={t(`${category}.title`)} intro={t(`${category}.intro`)} />
      {FILTERABLE.includes(category) ? (
        // nuqs solo hace falta en las listas filtrables: las demás páginas no cargan su adaptador.
        <NuqsAdapter>
          <FilterableCatalog cards={cards} regions={regions} withMonth={withMonth} />
        </NuqsAdapter>
      ) : (
        <div className="mx-auto max-w-6xl px-4">
          <CatalogGrid cards={cards} priorityFirst={1} />
        </div>
      )}
    </PageTransition>
  );
}

export async function detailMetadata(category: Category, { params }: SlugProps): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = resolveLocale(raw);
  const item = getDetail(category, slug, locale);
  if (!item) return {};
  const t = await getTranslations({ locale, namespace: 'catalog' });
  const tMeta = await getTranslations({ locale, namespace: 'meta' });
  const image = {
    url: ogImagePath(category, locale, slug),
    ...OG_SIZE,
    alt: item.photo?.alt ?? item.name,
    type: 'image/jpeg',
  };
  return {
    title: `${item.name} · ${t(`category.${category}`)}`,
    description: item.summary,
    alternates: buildAlternates(locale, `/${category}/${slug}`),
    openGraph: {
      type: 'article',
      siteName: tMeta('siteName'),
      title: item.name,
      description: item.summary,
      locale: locale === 'es' ? 'es_CO' : 'en_US',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: item.name,
      description: item.summary,
      images: [image.url],
    },
  };
}

/** Ficha completa (US2): contenido, datos, región y fichas relacionadas. */
export async function DetailPage({ category, params }: { category: Category } & SlugProps) {
  const { locale: raw, slug } = await params;
  const locale = resolveLocale(raw);
  setRequestLocale(locale);
  const item = getDetail(category, slug, locale);
  if (!item) notFound();
  const t = await getTranslations('catalog');
  const tSections = await getTranslations('sections');
  const related = category === 'regiones' ? [] : getRelated(category, slug, locale);

  return (
    <PageTransition>
      <nav
        aria-label={t('back', { section: tSections(`${category}.title`) })}
        className="mx-auto max-w-6xl px-4 pt-4"
      >
        <Link
          href={`/${category}`}
          transitionTypes={['nav-back']}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-link underline-offset-4 hover:underline"
        >
          ← {t('back', { section: tSections(`${category}.title`) })}
        </Link>
      </nav>
      <DetailContent item={item} variant="page" />
      {category === 'regiones' ? (
        <RegionContent region={slug as RegionSlug} locale={locale} />
      ) : null}
      {item.region && category !== 'regiones' ? (
        <p className="mx-auto mt-6 max-w-6xl px-4">
          <Link
            href={`/regiones/${item.region}`}
            className="inline-flex min-h-11 items-center font-semibold text-link underline underline-offset-4"
          >
            {t('seeRegion', { region: item.regionName ?? item.region })}
          </Link>
        </p>
      ) : null}
      {related.length > 0 ? (
        <section aria-labelledby="relacionadas" className="mx-auto mt-12 max-w-6xl px-4">
          <h2 id="relacionadas" className="font-display text-2xl font-bold">
            {t('related')}
          </h2>
          <div className="mt-4">
            <CatalogGrid cards={related} headingLevel="h3" />
          </div>
        </section>
      ) : null}
    </PageTransition>
  );
}

/** Fichas de una región agrupadas por categoría (US5). */
async function RegionContent({ region, locale }: { region: RegionSlug; locale: 'es' | 'en' }) {
  const t = await getTranslations('catalog');
  const tSections = await getTranslations('sections');
  const groups = getRegionCards(region, locale);
  return (
    <section aria-labelledby="contenido-region" className="mx-auto mt-12 max-w-6xl px-4">
      <h2 id="contenido-region" className="font-display text-3xl font-bold">
        {t('regionContent')}
      </h2>
      {REGION_CATEGORIES.filter((category) => groups[category].length > 0).map((category) => (
        <div key={category} className="mt-8">
          <h3 className="font-display text-2xl font-bold">
            <Link href={`/${category}?region=${region}`} className="hover:underline">
              {tSections(`${category}.title`)}
            </Link>
          </h3>
          <div className="mt-4">
            <CatalogGrid cards={groups[category]} headingLevel="h4" />
          </div>
        </div>
      ))}
    </section>
  );
}
