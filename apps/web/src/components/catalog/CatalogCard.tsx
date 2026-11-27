import type { CardItem } from '@viajacol/content';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { formatDate, monthsLabel } from '@/lib/dates';
import { CatalogPhoto } from './CatalogPhoto';
import { DemoBadge } from './DemoBadge';

type Props = {
  card: CardItem;
  headingLevel?: 'h2' | 'h3' | 'h4';
  /** La foto de esta tarjeta es la principal de la página (LCP). */
  priority?: boolean;
  sizes?: string;
};

const DEFAULT_SIZES = '(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw';

/** Tarjeta del catálogo. Sirve en el servidor y en el cliente (lista filtrable). */
export function CatalogCard({ card, headingLevel = 'h3', priority, sizes = DEFAULT_SIZES }: Props) {
  const locale = useLocale();
  const Heading = headingLevel;
  const meta = [card.regionName, card.place].filter(Boolean).join(' · ');

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-sm transition-shadow hover:shadow-lg has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-(--vc-focus)">
      <div className="aspect-4/3 overflow-hidden bg-line">
        <CatalogPhoto
          photo={card.photo}
          sizes={sizes}
          priority={priority}
          fallbackLabel={card.name}
          transitionName={`photo-${card.category}-${card.slug}`}
          className="transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {meta ? (
          <p className="text-xs font-semibold tracking-wide text-link uppercase">{meta}</p>
        ) : null}
        <Heading className="font-display text-xl leading-tight font-bold">
          <Link
            href={`/${card.category}/${card.slug}`}
            transitionTypes={['nav-forward']}
            className="outline-none after:absolute after:inset-0 after:content-['']"
          >
            {card.name}
          </Link>
        </Heading>
        <p className="text-sm text-muted">{card.summary}</p>
        {card.months ? (
          <p className="mt-auto pt-1 text-sm font-semibold text-foreground">
            {monthsLabel(card.months, locale)}
          </p>
        ) : null}
        {card.date ? (
          <p className="mt-auto flex flex-wrap items-center gap-2 pt-1 text-sm text-muted">
            <DemoBadge />
            <time dateTime={card.date}>{formatDate(card.date, locale)}</time>
          </p>
        ) : null}
      </div>
    </article>
  );
}
