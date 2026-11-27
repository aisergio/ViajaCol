import { getTranslations } from 'next-intl/server';
import { catalogKey, toTripView } from '@/domain/trip';
import { resolveLocale } from '@/i18n/locale';
import { getAccountServices } from '@/server/account-services';
import { getTrip } from '@/server/application/trips/use-cases';
import { homeFor } from '@/server/auth/return-path';
import { getSessionUser } from '@/server/auth/session';
import { catalogRefs } from '@/server/trips/catalog';
import { buildIcs, icsFileName } from '@/server/trips/ics';

type Context = { params: Promise<{ locale: string; tripId: string }> };

const NO_STORE = 'private, no-store';
const TRIP_ID = /^[A-Za-z0-9-]{1,64}$/;

/**
 * Itinerario en `.ics` (US6, escenario 3; contracts/rutas.md). Sin sesión, a «Entrar» con el regreso;
 * el viaje de otra persona responde 404, igual que uno que no existe.
 */
export async function GET(request: Request, { params }: Context) {
  const { locale: raw, tripId } = await params;
  const locale = resolveLocale(raw);
  const user = await getSessionUser(request.headers);
  if (!user) {
    const volver = encodeURIComponent(`${homeFor(locale)}/mi-viaje/${tripId}`);
    return new Response(null, {
      status: 307,
      headers: {
        location: `${homeFor(locale)}/entrar?volver=${volver}`,
        'cache-control': NO_STORE,
      },
    });
  }

  const { trips } = await getAccountServices();
  const trip = TRIP_ID.test(tripId) ? await getTrip(trips, user, tripId) : null;
  if (!trip)
    return new Response('Not Found', { status: 404, headers: { 'cache-control': NO_STORE } });

  const t = await getTranslations({ locale, namespace: 'trip' });
  const refs = catalogRefs(trip.items, locale);
  const body = buildIcs(
    toTripView(trip),
    {
      day: (n) => t('ics.day', { n }),
      kind: (kind) => t(`kinds.${kind}`),
      empty: t('ics.empty'),
      title: (item) =>
        item.kind !== 'nota' && item.slug
          ? (refs[catalogKey(item.kind, item.slug)]?.name ?? item.title)
          : item.title,
    },
    new Date(),
  );

  return new Response(body, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="${icsFileName(trip.name)}"`,
      'cache-control': NO_STORE,
    },
  });
}
