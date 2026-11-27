'use client';

import { useTranslations } from 'next-intl';
import { TRIP_LIMITS } from '@/domain/trip';
import { type BoardGroup, groupId } from '../model/board';
import type { NoteInput } from '../viewmodel/useTripEditorViewModel';

type Props = {
  idPrefix: string;
  groups: readonly BoardGroup[];
  groupLabel: (group: Pick<BoardGroup, 'day' | 'date'>) => string;
  initial?: Required<NoteInput>;
  onSave: (note: NoteInput) => void;
  onCancel?: () => void;
};

/** Nota libre (US3, escenario 4; FR-006): vuelos, hoteles o lo que haga falta, en un día o sin día. */
export function NoteForm({ idPrefix, groups, groupLabel, initial, onSave, onCancel }: Props) {
  const t = useTranslations('trip.editor.note');

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const day = groups.find((group) => group.id === data.get('day'))?.day ?? null;
    onSave({
      id: initial?.id,
      title: String(data.get('title') ?? ''),
      text: String(data.get('text') ?? ''),
      day,
    });
    if (!initial) form.reset();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor={`${idPrefix}-titulo`} className="block font-semibold">
          {t('title')}
        </label>
        <input
          id={`${idPrefix}-titulo`}
          name="title"
          required
          maxLength={TRIP_LIMITS.title}
          defaultValue={initial?.title}
          autoComplete="off"
          className="mt-1 block min-h-11 w-full rounded-md border border-line bg-background px-3"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-texto`} className="block font-semibold">
          {t('text')}
        </label>
        <textarea
          id={`${idPrefix}-texto`}
          name="text"
          rows={3}
          maxLength={TRIP_LIMITS.text}
          defaultValue={initial?.text}
          className="mt-1 block w-full rounded-md border border-line bg-background px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-dia`} className="block font-semibold">
          {t('day')}
        </label>
        <select
          id={`${idPrefix}-dia`}
          name="day"
          defaultValue={groupId(initial?.day ?? null)}
          className="mt-1 block min-h-11 w-full rounded-md border border-line bg-background px-2"
        >
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {groupLabel(group)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-semibold text-primary-foreground hover:opacity-90"
        >
          {t('save')}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-11 items-center rounded-md border border-line px-5 font-semibold hover:bg-surface"
          >
            {t('cancel')}
          </button>
        ) : null}
      </div>
    </form>
  );
}
