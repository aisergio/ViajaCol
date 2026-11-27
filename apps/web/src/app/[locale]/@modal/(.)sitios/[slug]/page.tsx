import { getDetail } from '@viajacol/content';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DetailContent } from '@/components/catalog/DetailContent';
import { detailMetadata, detailParams, type SlugProps } from '@/components/catalog/pages';
import { RouteModal } from '@/components/catalog/RouteModal';
import { resolveLocale } from '@/i18n/locale';
import { localizedPath } from '@/i18n/metadata';

export const dynamicParams = false;

export function generateStaticParams() {
  return detailParams('sitios');
}

/** El título de la pestaña cambia con la ventana, igual que en la página completa. */
export function generateMetadata(props: SlugProps) {
  return detailMetadata('sitios', props);
}

/** Ficha de un sitio en ventana, al navegar desde el sitio (US3). Recargar abre la página completa. */
export default async function SiteModal({ params }: SlugProps) {
  const { locale: raw, slug } = await params;
  const locale = resolveLocale(raw);
  setRequestLocale(locale);
  const item = getDetail('sitios', slug, locale);
  if (!item) notFound();
  const t = await getTranslations('catalog');
  const path = `${locale === 'es' ? '' : '/en'}/sitios/${slug}`;

  return (
    <RouteModal title={item.name} closeLabel={t('close')} path={path}>
      <DetailContent item={item} variant="modal" />
      <div className="px-5 pb-6 sm:px-7">
        <a
          href={localizedPath(locale, `/sitios/${slug}`)}
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {t('fullDetail')}
        </a>
      </div>
    </RouteModal>
  );
}
