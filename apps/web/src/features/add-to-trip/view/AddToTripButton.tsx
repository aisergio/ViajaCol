'use client';

import { Plus } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import type { DraftAddResult, DraftKind } from '@/features/trip-draft/model/draftStore';
import { Link } from '@/i18n/navigation';
import { useAddToTripViewModel } from '../viewmodel/useAddToTripViewModel';

// El diálogo solo se descarga cuando alguien con sesión lo abre (research D-06).
const AddToTripDialog = dynamic(() => import('./AddToTripDialog'), { ssr: false });

type Props = { kind: DraftKind; slug: string; name: string };

const DRAFT_MESSAGE: Record<
  DraftAddResult,
  'add.addedDraft' | 'add.duplicateDraft' | 'add.limitDraft'
> = {
  added: 'add.addedDraft',
  duplicate: 'add.duplicateDraft',
  limit: 'add.limitDraft',
};

/** «Agregar a Mi viaje» en las fichas del catálogo (US2, US5). */
export function AddToTripButton({ kind, slug, name }: Props) {
  const t = useTranslations('trip');
  const { state, start, close } = useAddToTripViewModel({ kind, slug, name });

  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
      <button
        type="button"
        onClick={start}
        aria-haspopup="dialog"
        className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 font-semibold text-primary-foreground hover:opacity-90"
      >
        <Plus aria-hidden="true" className="size-4" />
        {t('add.button')}
      </button>
      <p role="status" aria-live="polite" className="text-sm font-semibold">
        {state.phase === 'draft' ? (
          <>
            {t(DRAFT_MESSAGE[state.result])}{' '}
            <Link href="/mi-viaje" className="text-link underline">
              {t('add.openTrip')}
            </Link>
          </>
        ) : null}
      </p>
      {state.phase === 'dialog' ? (
        <AddToTripDialog kind={kind} slug={slug} name={name} onClose={close} />
      ) : null}
    </div>
  );
}
