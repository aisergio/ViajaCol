import type { DetailItem } from '@viajacol/content';
import { useTranslations } from 'next-intl';
import { CatalogPhoto } from './CatalogPhoto';
import { PhotoCredit } from './PhotoCredit';

/**
 * Foto de una fiesta en grande (ventana de `/fiestas/{slug}` desde la lista, US3). El enlace a la
 * ficha completa es una navegación normal para salir de la ruta interceptada.
 */
export function FestivalPhoto({ item, fullHref }: { item: DetailItem; fullHref: string }) {
  const t = useTranslations('catalog');
  return (
    <div className="pb-6">
      <div className="bg-black">
        <CatalogPhoto
          photo={item.photo}
          sizes="(min-width: 896px) 896px, 100vw"
          priority
          fallbackLabel={item.name}
          className="max-h-[70vh] object-contain"
        />
      </div>
      <div className="px-5 pt-4 sm:px-7">
        {item.photo ? <PhotoCredit credit={item.photo.credit} name={item.name} /> : null}
        <h2 className="mt-3 font-display text-3xl font-bold">{item.name}</h2>
        <p className="mt-1 font-semibold text-link">
          {[item.when, item.place].filter(Boolean).join(' · ')}
        </p>
        <p className="mt-3 text-muted">{item.summary}</p>
        <a
          href={fullHref}
          className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {t('fullDetail')}
        </a>
      </div>
    </div>
  );
}
