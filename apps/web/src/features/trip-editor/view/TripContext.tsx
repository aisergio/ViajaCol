'use client';

import { Check, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CatalogRef, FestivalSuggestion, TripItem, TripView } from '@/domain/trip';
import { Link } from '@/i18n/navigation';
import type { BoardGroup } from '../model/board';

type FestivalsProps = {
  trip: TripView;
  festivals: readonly FestivalSuggestion[];
  pending: boolean;
  onAdd: (slug: string, name: string) => void;
};

/** Fiestas del catálogo en los meses del viaje, para agregarlas (US7, escenario 2; FR-014). */
export function FestivalSuggestions({ trip, festivals, pending, onAdd }: FestivalsProps) {
  const t = useTranslations('trip.context');
  const inTrip = (slug: string) =>
    trip.items.some((item) => item.kind === 'fiesta' && item.slug === slug);

  return (
    <section aria-labelledby="fiestas-viaje" className="rounded-lg border border-line p-5">
      <h2 id="fiestas-viaje" className="font-display text-xl font-bold">
        {t('festivals')}
      </h2>
      {festivals.length === 0 ? (
        <p className="mt-2 text-sm">{t('festivalsNone')}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {festivals.map((festival) => (
            <li key={festival.slug} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0">
                <Link href={festival.ref.href} className="font-semibold hover:underline">
                  {festival.name}
                </Link>
                <span className="block text-sm text-muted">
                  {festival.when}
                  {festival.ref.place ? ` · ${festival.ref.place}` : ''}
                </span>
              </span>
              {inTrip(festival.slug) ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold">
                  <Check aria-hidden="true" className="size-4" />
                  {t('added')}
                </span>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onAdd(festival.slug, festival.name)}
                  aria-label={`${t('add')}: ${festival.name}`}
                  className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md border border-line px-3 font-semibold hover:bg-surface disabled:opacity-60"
                >
                  <Plus aria-hidden="true" className="size-4" />
                  {t('add')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type PlacesProps = {
  groups: readonly BoardGroup[];
  groupLabel: (group: Pick<BoardGroup, 'day' | 'date'>) => string;
  nameOf: (item: TripItem) => string;
  refOf: (item: TripItem) => CatalogRef | null | undefined;
};

/**
 * Lugares por día: la alternativa en texto del mapa (US7, escenario 1; FR-013). El mapa SVG con las
 * formas de las regiones llega con la spec 008 (tarea T030).
 */
export function PlacesByDay({ groups, groupLabel, nameOf, refOf }: PlacesProps) {
  const t = useTranslations('trip.context');
  const days = groups
    .filter((group) => group.day !== null)
    .map((group) => ({
      group,
      places: group.items.flatMap((item) => {
        const ref = refOf(item);
        return ref?.coords ? [ref.place ? `${nameOf(item)} (${ref.place})` : nameOf(item)] : [];
      }),
    }))
    .filter((day) => day.places.length > 0);

  return (
    <section aria-labelledby="lugares-viaje" className="rounded-lg border border-line p-5">
      <h2 id="lugares-viaje" className="font-display text-xl font-bold">
        {t('places')}
      </h2>
      {days.length === 0 ? (
        <p className="mt-2 text-sm">{t('placesNone')}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {days.map(({ group, places }) => (
            <li key={group.id}>
              <span className="font-semibold">{groupLabel(group)}:</span> {places.join(', ')}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
