import type { DetailItem } from '@viajacol/content';
import { cn } from '@viajacol/ui';
import { useTranslations } from 'next-intl';
import { AddToTripButton } from '@/features/add-to-trip/view/AddToTripButton';
import { CATEGORY_TO_KIND } from '@/server/trips/catalog';
import { CatalogPhoto } from './CatalogPhoto';
import { DemoBadge } from './DemoBadge';
import { FactList } from './FactList';
import { PhotoCredit } from './PhotoCredit';

type Props = { item: DetailItem; variant: 'page' | 'modal' };

/**
 * Cuerpo de una ficha (Server Component). Lo comparten la página completa y la ventana de la ruta
 * interceptada: en la ventana el título es h2 y la foto no lleva morph. En las dos, la foto es la
 * principal y se pide con prioridad alta.
 */
export function DetailContent({ item, variant }: Props) {
  const t = useTranslations('catalog');
  const isPage = variant === 'page';
  const Title = isPage ? 'h1' : 'h2';
  const width = isPage ? 'mx-auto max-w-6xl px-4' : 'px-5 sm:px-7';
  // Sitios, fiestas, platos y experiencias se pueden agregar a «Mi viaje» (spec 007, FR-003).
  const tripKind = CATEGORY_TO_KIND[item.category];

  return (
    <article className={isPage ? 'pb-4' : 'pb-7'}>
      <figure className={cn(isPage ? 'mx-auto max-w-6xl px-0 sm:px-4 sm:pt-6' : '')}>
        <div
          className={cn(
            'overflow-hidden bg-line',
            isPage ? 'aspect-video max-h-[70vh] w-full sm:rounded-xl' : 'aspect-video w-full',
          )}
        >
          <CatalogPhoto
            photo={item.photo}
            sizes={isPage ? '(min-width: 1152px) 1120px, 100vw' : '(min-width: 896px) 896px, 100vw'}
            priority
            fallbackLabel={item.name}
            transitionName={isPage ? `photo-${item.category}-${item.slug}` : undefined}
          />
        </div>
        {item.photo ? (
          <figcaption className={cn('mt-2', isPage ? 'px-4 sm:px-0' : 'px-5 sm:px-7')}>
            <PhotoCredit credit={item.photo.credit} name={item.name} />
          </figcaption>
        ) : null}
      </figure>

      <header className={cn(width, isPage ? 'mt-8' : 'mt-5')}>
        <p className="text-sm font-semibold tracking-wide text-link uppercase">
          {t(`category.${item.category}`)}
          {item.regionName ? ` · ${item.regionName}` : ''}
        </p>
        <Title
          className={cn(
            'mt-2 font-display font-bold tracking-tight',
            isPage ? 'text-4xl md:text-6xl' : 'text-3xl',
          )}
        >
          {item.name}
        </Title>
        <p className={cn('mt-4 max-w-3xl text-muted', isPage ? 'text-xl' : 'text-lg')}>
          {item.summary}
        </p>
        {item.demo ? (
          <p className="mt-4 flex max-w-3xl flex-wrap items-center gap-2 rounded-lg border border-line bg-surface p-3 text-sm">
            <DemoBadge />
            {t('demoNote')}
          </p>
        ) : null}
        {tripKind ? <AddToTripButton kind={tripKind} slug={item.slug} name={item.name} /> : null}
      </header>

      <div className={cn(width, 'mt-8 grid gap-8', isPage && 'md:grid-cols-[2fr_1fr]')}>
        <div className={cn('max-w-prose space-y-4 leading-relaxed', isPage && 'text-lg')}>
          {item.body.map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </div>
        <FactList item={item} />
      </div>
    </article>
  );
}
