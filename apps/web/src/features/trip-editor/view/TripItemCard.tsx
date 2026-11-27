'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@viajacol/ui';
import { ArrowDown, ArrowUp, GripVertical, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { TRIP_LIMITS, type CatalogRef, type TripItem } from '@/domain/trip';
import { Link } from '@/i18n/navigation';
import { type BoardGroup, groupId } from '../model/board';
import type { TripEditorViewModel } from '../viewmodel/useTripEditorViewModel';
import { NoteForm } from './NoteForm';

type Props = {
  item: TripItem;
  name: string;
  /** `null`: la ficha ya no existe en el catálogo; `undefined`: es una nota. */
  catalogRef: CatalogRef | null | undefined;
  index: number;
  count: number;
  groups: readonly BoardGroup[];
  groupLabel: (group: Pick<BoardGroup, 'day' | 'date'>) => string;
  vm: TripEditorViewModel;
};

const BUTTON =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-line hover:bg-surface aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

/** Un elemento del viaje: ficha o nota, con su costo y los controles para moverlo sin arrastrar. */
export function TripItemCard({
  item,
  name,
  catalogRef,
  index,
  count,
  groups,
  groupLabel,
  vm,
}: Props) {
  const t = useTranslations('trip');
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    attributes: { roleDescription: t('editor.roleDescription') },
  });
  const [target, setTarget] = useState<string>(groupId(item.day));
  const [editing, setEditing] = useState(false);
  const moveButton = useRef<HTMLButtonElement>(null);
  const focusHere =
    vm.focusRequest && 'itemId' in vm.focusRequest && vm.focusRequest.itemId === item.id;
  const nameId = `nombre-${item.id}`;
  const unavailable = catalogRef === null;

  // Si el elemento cambió de día con los botones, React lo monta en otra lista: el foco lo sigue.
  useEffect(() => {
    if (focusHere) moveButton.current?.focus();
  }, [focusHere, vm.focusRequest]);

  const style = { transform: CSS.Translate.toString(transform), transition };
  const dayOf = (id: string) => groups.find((group) => group.id === id)?.day ?? null;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn('rounded-md border border-line bg-background p-3', isDragging && 'opacity-40')}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={t('editor.drag', { name })}
          className={cn(BUTTON, 'cursor-grab touch-none border-transparent')}
        >
          <GripVertical aria-hidden="true" className="size-5" />
        </button>
        <div className="min-w-0 flex-1 pt-1">
          <p className="text-xs font-semibold tracking-wide text-link uppercase">
            {t(`kinds.${item.kind}`)}
            {unavailable ? ` · ${t('editor.unavailable')}` : ''}
          </p>
          {catalogRef ? (
            <Link id={nameId} href={catalogRef.href} className="font-semibold hover:underline">
              {name}
            </Link>
          ) : (
            <p id={nameId} className="font-semibold">
              {name}
            </p>
          )}
          {catalogRef?.place ? <p className="text-sm text-muted">{catalogRef.place}</p> : null}
          {item.kind === 'nota' && item.text && !editing ? (
            <p className="mt-1 text-sm whitespace-pre-line">{item.text}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => vm.remove(item.id)}
          aria-label={`${t('editor.remove')}: ${name}`}
          className={BUTTON}
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      {editing ? (
        <div className="mt-3">
          <NoteForm
            idPrefix={`nota-${item.id}`}
            groups={groups}
            groupLabel={groupLabel}
            initial={{ id: item.id, title: item.title, text: item.text ?? '', day: item.day }}
            onSave={(note) => {
              vm.saveNote(note);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <div
          role="group"
          aria-label={t('editor.itemActions', { name })}
          className="mt-3 flex flex-wrap items-end gap-3"
        >
          <CostField item={item} nameId={nameId} onCommit={(cost) => vm.setCost(item.id, cost)} />
          <div>
            <label
              id={`mover-etiqueta-${item.id}`}
              htmlFor={`mover-a-${item.id}`}
              className="block text-sm font-semibold"
            >
              {t('editor.moveTo')}
            </label>
            <div className="mt-1 flex gap-2">
              <select
                id={`mover-a-${item.id}`}
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                aria-labelledby={`mover-etiqueta-${item.id} ${nameId}`}
                className="min-h-11 rounded-md border border-line bg-background px-2"
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {groupLabel(group)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                ref={moveButton}
                onClick={() => vm.moveTo(item.id, dayOf(target))}
                className="inline-flex min-h-11 items-center rounded-md border border-line px-3 font-semibold hover:bg-surface"
              >
                {t('editor.move')}
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => vm.moveBy(item.id, -1)}
              aria-disabled={index === 0 || undefined}
              aria-label={`${t('editor.moveUp')}: ${name}`}
              className={BUTTON}
            >
              <ArrowUp aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => vm.moveBy(item.id, 1)}
              aria-disabled={index === count - 1 || undefined}
              aria-label={`${t('editor.moveDown')}: ${name}`}
              className={BUTTON}
            >
              <ArrowDown aria-hidden="true" className="size-4" />
            </button>
          </div>
          {item.kind === 'nota' ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex min-h-11 items-center rounded-md border border-line px-3 font-semibold hover:bg-surface"
            >
              {t('editor.note.edit')}
            </button>
          ) : null}
        </div>
      )}
    </li>
  );
}

/** Costo estimado (US4). Se guarda al salir del campo o con Enter; vacío quita el costo. */
function CostField({
  item,
  nameId,
  onCommit,
}: {
  item: TripItem;
  nameId: string;
  onCommit: (cost: number | null) => void;
}) {
  const t = useTranslations('trip.editor');
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? (item.cost === null ? '' : String(item.cost));

  const commit = () => {
    if (draft === null) return;
    const text = draft.trim();
    const cost = text === '' ? null : Number(text);
    const valid =
      cost === null || (Number.isInteger(cost) && cost >= 0 && cost <= TRIP_LIMITS.money);
    if (valid) onCommit(cost);
    setDraft(null);
  };

  return (
    <div>
      <label
        id={`costo-etiqueta-${item.id}`}
        htmlFor={`costo-${item.id}`}
        className="block text-sm font-semibold"
      >
        {t('cost')}
      </label>
      <input
        id={`costo-${item.id}`}
        type="number"
        inputMode="numeric"
        min={0}
        max={TRIP_LIMITS.money}
        step={1}
        value={value}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
        }}
        aria-labelledby={`costo-etiqueta-${item.id} ${nameId}`}
        aria-describedby="costo-ayuda"
        className="mt-1 block min-h-11 w-36 rounded-md border border-line bg-background px-3"
      />
    </div>
  );
}
