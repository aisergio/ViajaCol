import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import { dayCount } from '@/domain/trip';
import { formatDateRange } from '@/lib/dates';
import { loadSharedTrip } from '@/server/trips/shared';

type Context = { params: Promise<{ shareId: string }> };

export const dynamic = 'force-dynamic';

/**
 * Vista previa para redes del viaje compartido (US6; research D-07): PNG de 1200 × 630 con `next/og`,
 * que corre en Lambda sin `sharp`. Se guarda un minuto en la CDN: un enlace revocado deja de tener
 * vista previa en menos de un minuto (SC-006).
 */
export async function GET(request: Request, { params }: Context) {
  const { shareId } = await params;
  const trip = await loadSharedTrip(shareId);
  if (!trip)
    return new Response('Not Found', { status: 404, headers: { 'cache-control': 'no-store' } });

  const locale = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'es';
  const t = await getTranslations({ locale, namespace: 'trip' });
  const days = dayCount(trip.startDate, trip.endDate);
  const summary = `${formatDateRange(trip.startDate, trip.endDate, locale)} · ${t('list.days', { count: days })} · ${t('list.items', { count: trip.items.length })}`;

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        background: '#0e1a20',
        color: '#ffffff',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', padding: '72px 72px 0' }}>
        <div style={{ fontSize: 30, color: '#FCD116', textTransform: 'uppercase' }}>
          {t('shared.eyebrow')}
        </div>
        <div style={{ fontSize: trip.name.length > 32 ? 64 : 84, lineHeight: 1.05, marginTop: 20 }}>
          {trip.name}
        </div>
        <div style={{ fontSize: 32, marginTop: 28, opacity: 0.9 }}>{summary}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 30, padding: '0 72px 40px', opacity: 0.9 }}>
          {t('shared.brand')}
        </div>
        <div style={{ display: 'flex', width: 1200, height: 16 }}>
          <div style={{ width: 600, height: 16, background: '#FCD116' }} />
          <div style={{ width: 300, height: 16, background: '#003893' }} />
          <div style={{ width: 300, height: 16, background: '#CE1126' }} />
        </div>
      </div>
    </div>,
    { width: 1200, height: 630, headers: { 'cache-control': 'public, max-age=60' } },
  );
}
