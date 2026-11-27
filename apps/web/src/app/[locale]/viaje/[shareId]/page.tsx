import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { TripReadOnly } from '@/components/trips/TripReadOnly';
import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { catalogRefs } from '@/server/trips/catalog';
import { loadSharedTrip } from '@/server/trips/shared';

type Props = { params: Promise<{ locale: string; shareId: string }> };

// Se consulta en cada petición: un enlace revocado deja de abrir de inmediato (SC-006).
export const dynamic = 'force-dynamic';

const OG_SIZE = { width: 1200, height: 630 };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, shareId } = await params;
  const locale = resolveLocale(raw);
  const trip = await loadSharedTrip(shareId);
  if (!trip) return { robots: { index: false, follow: false } };
  const t = await getTranslations({ locale, namespace: 'trip.shared' });
  const image = {
    url: `/ViajaCol/api/og/viaje/${shareId}?lang=${locale}`,
    ...OG_SIZE,
    alt: t('ogAlt', { name: trip.name }),
    type: 'image/png',
  };
  return {
    title: trip.name,
    // Solo lectura y sin indexar (FR-011).
    robots: { index: false, follow: false },
    openGraph: { type: 'website', title: trip.name, siteName: t('brand'), images: [image] },
    twitter: { card: 'summary_large_image', title: trip.name, images: [image.url] },
  };
}

/** Viaje compartido (US6): cualquiera con el enlace lo lee; nadie lo cambia. */
export default async function SharedTripPage({ params }: Props) {
  const { locale: raw, shareId } = await params;
  const locale = resolveLocale(raw);
  setRequestLocale(locale);
  const trip = await loadSharedTrip(shareId);
  if (!trip) notFound();
  const t = await getTranslations('trip.shared');

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <TripReadOnly trip={trip} refs={catalogRefs(trip.items, locale)} locale={locale} />
      <p className="mt-10">
        <Link
          href="/mi-viaje"
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-semibold text-primary-foreground hover:opacity-90"
        >
          {t('cta')}
        </Link>
      </p>
    </div>
  );
}
