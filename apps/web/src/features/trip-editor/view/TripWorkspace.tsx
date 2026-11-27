'use client';

import { CalendarArrowDown } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import {
  type CatalogRef,
  type FestivalSuggestion,
  type TripItem,
  type TripView,
  catalogKey,
  dayCount,
  dayDate,
} from '@/domain/trip';
import { formatDateRange, formatTripDay } from '@/lib/dates';
import type { BoardGroup } from '../model/board';
import {
  type EditorNotice,
  type TripEditorActions,
  useTripEditorViewModel,
} from '../viewmodel/useTripEditorViewModel';
import { BudgetSummary } from './BudgetSummary';
import { NoteForm } from './NoteForm';
import { SharePanel } from './SharePanel';
import { TripBoard } from './TripBoard';
import { FestivalSuggestions, PlacesByDay } from './TripContext';
import { TripDetailsForm } from './TripDetailsForm';

type Props = {
  initial: TripView;
  actions: TripEditorActions;
  /** Fichas del viaje en el idioma de la página (`null`: ya no existe). */
  refs: Readonly<Record<string, CatalogRef | null>>;
  festivals: readonly FestivalSuggestion[];
  shareBase: string;
  icsHref: string;
  /** Clima: lo genera el servidor (Server Component) y llega ya dibujado. */
  weather?: ReactNode;
  /** Formulario para eliminar el viaje. */
  danger: ReactNode;
};

/** Editor de un viaje (US3, US4, US6, US7). El estado vive en `useTripEditorViewModel`. */
export function TripWorkspace({
  initial,
  actions,
  refs,
  festivals,
  shareBase,
  icsHref,
  weather,
  danger,
}: Props) {
  const t = useTranslations('trip');
  const locale = useLocale();
  const allRefs: Readonly<Record<string, CatalogRef | null>> = {
    ...Object.fromEntries(
      festivals.map((festival) => [catalogKey('fiesta', festival.slug), festival.ref]),
    ),
    ...refs,
  };
  const refOf = (item: TripItem) =>
    item.kind === 'nota' || !item.slug ? undefined : allRefs[catalogKey(item.kind, item.slug)];
  const nameOf = (item: TripItem) => refOf(item)?.name ?? item.title;
  const vm = useTripEditorViewModel(initial, actions, { locale, nameOf });
  const { trip } = vm;

  const groupLabel = (group: Pick<BoardGroup, 'day' | 'date'>) =>
    group.day === null
      ? t('editor.unassigned')
      : t('editor.day', {
          n: group.day + 1,
          date: formatTripDay(group.date ?? dayDate(trip.startDate, group.day), locale),
        });

  const noticeText = (notice: EditorNotice): string => {
    switch (notice.kind) {
      case 'error':
        return t(`errors.${notice.error}`);
      case 'saved':
        return t('editor.saved');
      case 'note-saved':
        return t('editor.noteSaved');
      case 'shared':
        return t('share.shared');
      case 'revoked':
        return t('share.revoked');
      case 'added':
        return t('add.added', { trip: trip.name });
      case 'removed':
        return t('editor.removed', { name: notice.name });
      case 'moved':
        return t('editor.moved', {
          name: notice.name,
          target: groupLabel({ day: notice.day, date: null }),
          position: notice.position,
        });
    }
  };

  return (
    <>
      <header>
        <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">{trip.name}</h1>
        <p className="mt-3 text-lg text-muted">
          {formatDateRange(trip.startDate, trip.endDate, locale)} ·{' '}
          {t('editor.summary', {
            days: dayCount(trip.startDate, trip.endDate),
            travelers: trip.travelers,
          })}
        </p>
        <p className="mt-4">
          <a
            href={icsHref}
            download
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-4 font-semibold hover:bg-surface"
          >
            <CalendarArrowDown aria-hidden="true" className="size-4" />
            {t('exportIcs')}
          </a>
        </p>
      </header>

      {/* Debajo del encabezado del sitio (h-16), que también es fijo. */}
      <div className="sticky top-16 z-10 -mx-4 mt-6 bg-background/95 px-4 py-2 backdrop-blur">
        <p role="status" aria-live="polite" className="min-h-6 font-semibold">
          {vm.notice ? noticeText(vm.notice) : null}
          {vm.pending ? (
            <span aria-hidden="true" className="ml-2 text-sm font-normal text-muted">
              {t('editor.pending')}
            </span>
          ) : null}
        </p>
      </div>

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="itinerario">
          <h2 id="itinerario" className="font-display text-2xl font-bold">
            {t('editor.board')}
          </h2>
          <p className="mt-2 text-sm text-muted">{t('editor.instructions')}</p>
          <p id="costo-ayuda" className="mt-1 mb-4 text-sm text-muted">
            {t('editor.costHint')}
          </p>
          <TripBoard vm={vm} groupLabel={groupLabel} nameOf={nameOf} refOf={refOf} />
        </section>

        <div className="space-y-6">
          <BudgetSummary totals={vm.totals} budget={trip.budget} />
          <section aria-labelledby="nueva-nota" className="rounded-lg border border-line p-5">
            <h2 id="nueva-nota" className="font-display text-xl font-bold">
              {t('editor.note.add')}
            </h2>
            <div className="mt-3">
              <NoteForm
                idPrefix="nueva-nota"
                groups={vm.groups}
                groupLabel={groupLabel}
                onSave={vm.saveNote}
              />
            </div>
          </section>
          <SharePanel
            shareId={trip.shareId}
            shareBase={shareBase}
            pending={vm.pending}
            onShare={vm.share}
            onUnshare={vm.unshare}
          />
          <FestivalSuggestions
            trip={trip}
            festivals={festivals}
            pending={vm.pending}
            onAdd={vm.addFestival}
          />
          <PlacesByDay groups={vm.groups} groupLabel={groupLabel} nameOf={nameOf} refOf={refOf} />
          {weather}
          <TripDetailsForm
            trip={trip}
            errors={vm.detailsErrors}
            pending={vm.pending}
            onSave={vm.saveDetails}
          />
          <section aria-labelledby="eliminar-viaje" className="rounded-lg border border-line p-5">
            <h2 id="eliminar-viaje" className="font-display text-xl font-bold">
              {t('remove.button')}
            </h2>
            <div className="mt-3">{danger}</div>
          </section>
        </div>
      </div>
    </>
  );
}
