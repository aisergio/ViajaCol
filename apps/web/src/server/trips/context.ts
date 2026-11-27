import { getCards, getDetail } from '@viajacol/content';
import { type FestivalSuggestion, type TripView, dayCount, dayDate } from '@/domain/trip';
import { monthsLabel } from '@/lib/dates';

/** Meses (1 a 12) que toca el viaje, en orden. */
export function tripMonths(startDate: string, endDate: string): number[] {
  const months = new Set<number>();
  for (let day = 0; day < dayCount(startDate, endDate); day++) {
    months.add(Number(dayDate(startDate, day).slice(5, 7)));
  }
  return [...months];
}

/**
 * Fiestas del catálogo de los meses del viaje (US7, escenario 2; research D-08). Las fechas exactas
 * por año llegan con la spec 005: por ahora se compara por mes.
 */
export function festivalsForTrip(
  trip: Pick<TripView, 'startDate' | 'endDate'>,
  locale: 'es' | 'en',
): FestivalSuggestion[] {
  const months = tripMonths(trip.startDate, trip.endDate);
  return getCards('fiestas', locale)
    .filter((card) => card.months?.some((month) => months.includes(month)))
    .map((card) => {
      const detail = getDetail('fiestas', card.slug, locale);
      return {
        slug: card.slug,
        name: card.name,
        when: detail?.when ?? monthsLabel(card.months ?? [], locale),
        ref: {
          name: card.name,
          href: `/fiestas/${card.slug}`,
          place: card.place,
          coords: detail?.coords ?? null,
        },
      };
    });
}
