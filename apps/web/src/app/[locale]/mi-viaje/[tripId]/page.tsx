import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cache } from 'react';
import { WeatherSection } from '@/components/trips/WeatherSection';
import { toTripView } from '@/domain/trip';
import { TripWorkspace } from '@/features/trip-editor/view/TripWorkspace';
import { DeleteTripForm } from '@/features/trip-list/view/DeleteTripForm';
import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { getAccountServices } from '@/server/account-services';
import { getTrip } from '@/server/application/trips/use-cases';
import { getAuthConfig } from '@/server/auth/auth';
import { homeFor } from '@/server/auth/return-path';
import { getSessionUser } from '@/server/auth/session';
import { catalogRefs } from '@/server/trips/catalog';
import { festivalsForTrip } from '@/server/trips/context';
import { weatherForTrip } from '@/server/trips/weather';
import {
  agregarAlViaje,
  compartirViaje,
  dejarDeCompartir,
  editarViaje,
  eliminarViaje,
  guardarNota,
  moverElemento,
  ponerCosto,
  quitarElemento,
} from '../actions';

type Props = { params: Promise<{ locale: string; tripId: string }> };

// Privada: se genera en cada petición y Next.js la marca `no-store` (contracts/rutas.md).
export const dynamic = 'force-dynamic';

const TRIP_ID = /^[A-Za-z0-9-]{1,64}$/;

/** El viaje del usuario de la sesión, una vez por petición (lo usan los metadatos y la página). */
const loadOwnTrip = cache(async (tripId: string) => {
  const user = await getSessionUser();
  if (!user) return { user: null, trip: null };
  if (!TRIP_ID.test(tripId)) return { user, trip: null };
  const { trips } = await getAccountServices();
  return { user, trip: await getTrip(trips, user, tripId) };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, tripId } = await params;
  const locale = resolveLocale(raw);
  const t = await getTranslations({ locale, namespace: 'trip.list' });
  const { trip } = await loadOwnTrip(tripId);
  return { title: trip?.name ?? t('title'), robots: { index: false, follow: false } };
}

/**
 * Editor de un viaje (US3, US4, US6, US7). Solo su dueño lo ve: el viaje de otra persona responde 404,
 * igual que uno que no existe (FR-002, SC-002).
 */
export default async function TripPage({ params }: Props) {
  const { locale: raw, tripId } = await params;
  const locale = resolveLocale(raw);
  setRequestLocale(locale);

  const { user, trip } = await loadOwnTrip(tripId);
  if (!user) {
    const prefix = locale === 'en' ? '/en' : '';
    redirect(
      `${prefix}/entrar?volver=${encodeURIComponent(`${homeFor(locale)}/mi-viaje/${tripId}`)}`,
    );
  }
  if (!trip) notFound();

  const t = await getTranslations('trip');
  const view = toTripView(trip);
  const refs = catalogRefs(view.items, locale);
  const [config, weather] = await Promise.all([getAuthConfig(), weatherForTrip(view, refs)]);
  const shareBase = `${config.origin}${homeFor(locale)}/viaje/`;
  const actions = {
    move: moverElemento,
    remove: quitarElemento,
    setCost: ponerCosto,
    saveNote: guardarNota,
    saveDetails: editarViaje,
    share: compartirViaje,
    unshare: dejarDeCompartir,
    addFromCatalog: agregarAlViaje,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-12">
      <nav aria-label={t('editor.back')} className="mb-6">
        <Link
          href="/mi-viaje"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-link underline-offset-4 hover:underline"
        >
          ← {t('editor.back')}
        </Link>
      </nav>
      <TripWorkspace
        initial={view}
        actions={actions}
        refs={refs}
        festivals={festivalsForTrip(view, locale)}
        shareBase={shareBase}
        icsHref={`${homeFor(locale)}/mi-viaje/${trip.tripId}/calendario`}
        weather={weather ? <WeatherSection weather={weather} locale={locale} /> : null}
        danger={
          <DeleteTripForm action={eliminarViaje.bind(null, locale, trip.tripId)} name={trip.name} />
        }
      />
    </div>
  );
}
