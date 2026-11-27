import { getTranslations } from 'next-intl/server';
import {
  type CatalogRef,
  type TripView,
  catalogKey,
  dayCount,
  groupByDay,
  dayDate,
} from '@/domain/trip';
import { Link } from '@/i18n/navigation';
import { formatDateRange, formatTripDay } from '@/lib/dates';

type Props = {
  trip: Pick<TripView, 'name' | 'startDate' | 'endDate' | 'travelers' | 'items'>;
  refs: Readonly<Record<string, CatalogRef | null>>;
  locale: 'es' | 'en';
};

/**
 * Viaje de solo lectura para el enlace compartido (US6, escenario 1). No muestra nada de la cuenta del
 * dueño (ni correo ni nombre) ni el presupuesto: solo el itinerario.
 */
export async function TripReadOnly({ trip, refs, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'trip' });
  const byDay = groupByDay(trip.items);
  const days = dayCount(trip.startDate, trip.endDate);
  const groups = [
    ...Array.from({ length: days }, (_, day) => ({
      key: `dia-${day}`,
      label: t('editor.day', {
        n: day + 1,
        date: formatTripDay(dayDate(trip.startDate, day), locale),
      }),
      items: byDay.get(day) ?? [],
    })),
    { key: 'sin-dia', label: t('editor.unassigned'), items: byDay.get(null) ?? [] },
  ].filter((group) => group.key !== 'sin-dia' || group.items.length > 0);

  return (
    <>
      <header>
        <p className="text-sm font-semibold tracking-wide text-link uppercase">
          {t('shared.eyebrow')}
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">
          {trip.name}
        </h1>
        <p className="mt-3 text-lg text-muted">
          {formatDateRange(trip.startDate, trip.endDate, locale)} ·{' '}
          {t('editor.summary', { days, travelers: trip.travelers })}
        </p>
      </header>
      <ol className="mt-8 space-y-6">
        {groups.map((group) => (
          <li key={group.key} className="rounded-lg border border-line p-5">
            <h2 className="font-display text-xl font-bold">{group.label}</h2>
            {group.items.length === 0 ? (
              <p className="mt-2 text-sm text-muted">{t('editor.empty')}</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {group.items.map((item) => {
                  const ref =
                    item.kind === 'nota' || !item.slug
                      ? undefined
                      : refs[catalogKey(item.kind, item.slug)];
                  return (
                    <li key={item.id}>
                      <span className="block text-xs font-semibold tracking-wide text-link uppercase">
                        {t(`kinds.${item.kind}`)}
                        {ref === null ? ` · ${t('editor.unavailable')}` : ''}
                      </span>
                      {ref ? (
                        <Link href={ref.href} className="font-semibold hover:underline">
                          {ref.name}
                        </Link>
                      ) : (
                        <span className="font-semibold">{item.title}</span>
                      )}
                      {ref?.place ? (
                        <span className="block text-sm text-muted">{ref.place}</span>
                      ) : null}
                      {item.kind === 'nota' && item.text ? (
                        <span className="mt-1 block text-sm whitespace-pre-line">{item.text}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}
