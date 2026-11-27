import { getDetail } from '@viajacol/content';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FestivalPhoto } from '@/components/catalog/FestivalPhoto';
import { detailMetadata, detailParams, type SlugProps } from '@/components/catalog/pages';
import { RouteModal } from '@/components/catalog/RouteModal';
import { resolveLocale } from '@/i18n/locale';
import { localizedPath } from '@/i18n/metadata';

export const dynamicParams = false;

export function generateStaticParams() {
  return detailParams('fiestas');
}

/** El título de la pestaña cambia con la ventana, igual que en la página completa. */
export function generateMetadata(props: SlugProps) {
  return detailMetadata('fiestas', props);
}

/** Foto de una fiesta en grande, al navegar desde el sitio (US3). Recargar abre la página completa. */
export default async function FestivalModal({ params }: SlugProps) {
  const { locale: raw, slug } = await params;
  const locale = resolveLocale(raw);
  setRequestLocale(locale);
  const item = getDetail('fiestas', slug, locale);
  if (!item) notFound();
  const t = await getTranslations('catalog');
  const path = `${locale === 'es' ? '' : '/en'}/fiestas/${slug}`;

  return (
    <RouteModal title={item.name} closeLabel={t('close')} path={path}>
      <FestivalPhoto item={item} fullHref={localizedPath(locale, `/fiestas/${slug}`)} />
    </RouteModal>
  );
}
