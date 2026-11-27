'use client';

import { X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { agregarAlViaje, listarMisViajes } from '@/app/[locale]/mi-viaje/actions';
import type { DraftAddResult, DraftKind } from '@/features/trip-draft/model/draftStore';
import { Link } from '@/i18n/navigation';
import { useAddToTripDialogViewModel } from '../viewmodel/useAddToTripDialogViewModel';

type Props = { kind: DraftKind; slug: string; name: string; onClose: () => void };

const ACTIONS = { list: listarMisViajes, add: agregarAlViaje };

/** Mensaje cuando la sesión venció y el elemento fue al borrador. */
function draftMessageKey(result: DraftAddResult) {
  return result === 'added'
    ? 'add.sessionEnded'
    : result === 'duplicate'
      ? 'add.duplicateDraft'
      : 'add.limitDraft';
}

/**
 * Diálogo «Agregar a un viaje» (US2). Es un `<dialog>` modal nativo: atrapa el foco, Escape lo cierra
 * y el navegador devuelve el foco al botón que lo abrió. Se carga con `next/dynamic` solo cuando se
 * usa (research D-06).
 */
export default function AddToTripDialog({ kind, slug, name, onClose }: Props) {
  const t = useTranslations('trip');
  const locale = useLocale();
  const ref = useRef<HTMLDialogElement>(null);
  const { status, trips, add } = useAddToTripDialogViewModel({ locale, kind, slug, name }, ACTIONS);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="agregar-titulo"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-line bg-background p-0 text-foreground shadow-xl backdrop:bg-black/50"
    >
      <div className="flex items-start justify-between gap-3 border-b border-line p-5">
        <h2 id="agregar-titulo" className="font-display text-xl font-bold">
          {t('add.dialogTitle', { name })}
        </h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label={t('add.close')}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-line hover:bg-surface"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      <div className="p-5">
        {status.phase === 'loading' ? <p>{t('add.loading')}</p> : null}
        {status.phase === 'ready' && trips.length === 0 ? <p>{t('add.noTrips')}</p> : null}
        {trips.length > 0 && status.phase !== 'draft' ? (
          <ul className="space-y-2">
            {trips.map((trip) => (
              <li key={trip.tripId}>
                <button
                  type="button"
                  disabled={status.phase === 'adding'}
                  onClick={() => void add(trip)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-line px-4 py-2 text-left hover:bg-surface disabled:opacity-60"
                >
                  <span className="font-semibold">{trip.name}</span>
                  <span className="text-sm text-muted">
                    {status.phase === 'adding' && status.tripId === trip.tripId
                      ? t('add.adding')
                      : t('list.items', { count: trip.count })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <p role="status" aria-live="polite" className="mt-4 min-h-6 font-semibold">
          {status.phase === 'added' ? t('add.added', { trip: status.tripName }) : null}
          {status.phase === 'error' ? t(`errors.${status.error}`) : null}
          {status.phase === 'draft' ? t(draftMessageKey(status.result)) : null}
        </p>
        <Link
          href="/mi-viaje"
          className="mt-2 inline-flex min-h-11 items-center font-semibold text-link underline"
        >
          {status.phase === 'ready' && trips.length === 0
            ? t('add.createFirst')
            : t('add.openTrip')}
        </Link>
      </div>
    </dialog>
  );
}
