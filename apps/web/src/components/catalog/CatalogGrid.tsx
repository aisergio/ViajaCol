import type { CardItem } from '@viajacol/content';
import { CatalogCard } from './CatalogCard';

type Props = {
  cards: readonly CardItem[];
  headingLevel?: 'h2' | 'h3' | 'h4';
  /** Cuántas fotos del inicio se piden de inmediato y con prioridad alta (la foto LCP de la lista). */
  priorityFirst?: number;
};

export function CatalogGrid({ cards, headingLevel = 'h2', priorityFirst = 0 }: Props) {
  return (
    <ul role="list" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, index) => (
        <li key={`${card.category}/${card.slug}`}>
          <CatalogCard card={card} headingLevel={headingLevel} priority={index < priorityFirst} />
        </li>
      ))}
    </ul>
  );
}
