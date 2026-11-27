import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { TRIP_LIMITS, dayCount, dayDate } from '@/domain/trip';
import { signInHref } from '@/features/account/model/session';
import { DraftMigrator } from '@/features/trip-draft/view/DraftMigrator';
import { DraftView } from '@/features/trip-draft/view/DraftView';
import { CreateTripForm } from '@/features/trip-list/view/CreateTripForm';
import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { formatDateRange } from '@/lib/dates';
import { getAccountServices } from '@/server/account-services';
import { listTrips, todayInColombia } from '@/server/application/trips/use-cases';
import { homeFor } from '@/server/auth/return-path';
import { getSessionUser } from '@/server/auth/session';
import { crearViaje, migrarBorrador } from './actions';

type Props = { params: Promise<{ locale: string }> };

// Depende de la sesión: se genera en cada petición y Next.js la marca `no-store` (contracts/rutas.md).
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'trip.list' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

/**
 * «Mi viaje» (US1, US5). Con sesión: los viajes del usuario, crear uno y la migración del borrador.
 * Sin sesión: el borrador de este navegador y la invitación a entrar.
 */
export default async function MyTripsPage({ params }: Props) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('trip');
  const user = await getSessionUser();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
        {t('list.title')}
      </h1>
      <p className="mt-4 text-lg text-muted">{t('list.intro')}</p>
      {user ? (
        <UserTrips sub={user.sub} locale={locale} />
      ) : (
        <DraftView signInHref={signInHref(locale, `${homeFor(locale)}/mi-viaje`)} />
      )}
    </div>
  );
}

async function UserTrips({ sub, locale }: { sub: string; locale: 'es' | 'en' }) {
  const t = await getTranslations('trip');
  const { trips } = await getAccountServices();
  const list = await listTrips(trips, { sub });
  const start = todayInColombia(new Date());
  const defaults = {
    name: '',
    startDate: start,
    endDate: dayDate(start, 2),
    travelers: '1',
    budget: '0',
  };

  return (
    <>
      <DraftMigrator locale={locale} migrate={migrarBorrador} />
      <section aria-labelledby="mis-viajes" className="mt-10">
        <h2 id="mis-viajes" className="font-display text-2xl font-bold">
          {t('list.yours')}
        </h2>
        {list.length === 0 ? (
          <p className="mt-3">{t('list.empty')}</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {list.map((trip) => (
              <li
                key={trip.tripId}
                className="relative rounded-lg border border-line p-5 hover:bg-surface"
              >
                <h3 className="font-display text-xl font-bold">
                  <Link
                    href={`/mi-viaje/${trip.tripId}`}
                    className="after:absolute after:inset-0 hover:underline"
                  >
                    {trip.name}
                  </Link>
                </h3>
                <p className="mt-1 text-muted">
                  {formatDateRange(trip.startDate, trip.endDate, locale)}
                </p>
                <p className="mt-1 text-sm">
                  {t('list.days', { count: dayCount(trip.startDate, trip.endDate) })} ·{' '}
                  {t('list.items', { count: trip.items.length })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section
        aria-labelledby="nuevo-viaje-titulo"
        className="mt-10 rounded-lg border border-line p-6"
      >
        <h2 id="nuevo-viaje-titulo" className="font-display text-2xl font-bold">
          {t('form.createTitle')}
        </h2>
        {list.length >= TRIP_LIMITS.trips ? (
          <p className="mt-3">{t('list.atLimit')}</p>
        ) : (
          <div className="mt-4">
            <CreateTripForm action={crearViaje.bind(null, locale)} defaults={defaults} />
          </div>
        )}
      </section>
    </>
  );
}
