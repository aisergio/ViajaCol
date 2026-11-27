'use client';

import {
  type Announcements,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  type UniqueIdentifier,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { cn } from '@viajacol/ui';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type { CatalogRef, TripItem } from '@/domain/trip';
import { type BoardGroup, locate, resolveDrop } from '../model/board';
import type { TripEditorViewModel } from '../viewmodel/useTripEditorViewModel';
import { TripItemCard } from './TripItemCard';

type Props = {
  vm: TripEditorViewModel;
  groupLabel: (group: Pick<BoardGroup, 'day' | 'date'>) => string;
  nameOf: (item: TripItem) => string;
  refOf: (item: TripItem) => CatalogRef | null | undefined;
};

/**
 * Itinerario por días (US3). Se mueve con el ratón, el tacto y el teclado (dnd-kit, research D-04) y,
 * además, con «Mover a…», «Subir» y «Bajar» en cada elemento. Los anuncios del arrastre van en el
 * idioma de la página.
 */
export function TripBoard({ vm, groupLabel, nameOf, refOf }: Props) {
  const t = useTranslations('trip.editor');
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const itemName = (id: UniqueIdentifier) => {
    const item = vm.trip.items.find((candidate) => candidate.id === id);
    return item ? nameOf(item) : '';
  };
  const targetName = (id: UniqueIdentifier) => {
    const group =
      vm.groups.find((candidate) => candidate.id === id) ?? locate(vm.groups, String(id))?.group;
    return group ? groupLabel(group) : '';
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => t('announcements.start', { name: itemName(active.id) }),
    onDragOver: ({ active, over }) =>
      over
        ? t('announcements.over', { name: itemName(active.id), target: targetName(over.id) })
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? t('announcements.end', { name: itemName(active.id), target: targetName(over.id) })
        : t('announcements.cancel', { name: itemName(active.id) }),
    onDragCancel: ({ active }) => t('announcements.cancel', { name: itemName(active.id) }),
  };

  const onDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    const target = resolveDrop(vm.groups, String(active.id), String(over.id));
    if (target) vm.move(String(active.id), target.day, target.index);
  };
  const active = activeId ? vm.trip.items.find((item) => item.id === activeId) : undefined;

  return (
    <DndContext
      id="tablero-viaje"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{ announcements, screenReaderInstructions: { draggable: t('instructions') } }}
    >
      <div className="space-y-5">
        {vm.groups.map((group) => (
          <GroupColumn key={group.id} group={group} label={groupLabel(group)} vm={vm}>
            {group.items.map((item, index) => (
              <TripItemCard
                key={item.id}
                item={item}
                name={nameOf(item)}
                catalogRef={refOf(item)}
                index={index}
                count={group.items.length}
                groups={vm.groups}
                groupLabel={groupLabel}
                vm={vm}
              />
            ))}
          </GroupColumn>
        ))}
      </div>
      <DragOverlay>
        {active ? (
          <div className="rounded-md border border-line bg-background px-4 py-3 font-semibold shadow-lg">
            {nameOf(active)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function GroupColumn({
  group,
  label,
  vm,
  children,
}: {
  group: BoardGroup;
  label: string;
  vm: TripEditorViewModel;
  children: React.ReactNode;
}) {
  const t = useTranslations('trip.editor');
  const { setNodeRef, isOver } = useDroppable({ id: group.id });
  const heading = useRef<HTMLHeadingElement>(null);
  const focusHere =
    vm.focusRequest && 'groupId' in vm.focusRequest && vm.focusRequest.groupId === group.id;

  // Al quitar un elemento, el foco pasa al título de su grupo (el botón desaparece).
  useEffect(() => {
    if (focusHere) heading.current?.focus();
  }, [focusHere, vm.focusRequest]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-lg border border-line p-4 transition-colors',
        group.day === null && 'bg-surface',
        isOver && 'ring-2 ring-[var(--vc-flag-blue)]',
      )}
    >
      <h3
        ref={heading}
        id={`grupo-${group.id}`}
        tabIndex={-1}
        className="font-display text-lg font-bold outline-none"
      >
        {label}{' '}
        <span className="text-sm font-normal text-muted">
          · {t('itemCount', { count: group.items.length })}
        </span>
      </h3>
      <SortableContext
        id={group.id}
        items={group.items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        {group.items.length ? (
          <ul aria-labelledby={`grupo-${group.id}`} className="mt-3 space-y-3">
            {children}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">{t('empty')}</p>
        )}
      </SortableContext>
    </div>
  );
}
