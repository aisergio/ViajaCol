import { type TripItem, type TripView, dayCount, dayDate, groupByDay } from '@/domain/trip';

/** Identificador del grupo «Sin día» y de cada día en el tablero (también son zonas para soltar). */
export const UNASSIGNED = 'sin-dia';
export type GroupId = typeof UNASSIGNED | `dia-${number}`;

export interface BoardGroup {
  id: GroupId;
  /** Índice del día (0 = primero) o `null` para «Sin día». */
  day: number | null;
  /** Fecha `AAAA-MM-DD` del día; `null` en «Sin día». */
  date: string | null;
  items: TripItem[];
}

export function groupId(day: number | null): GroupId {
  return day === null ? UNASSIGNED : `dia-${day}`;
}

/** «Sin día» primero (ahí llegan las fichas nuevas) y luego un grupo por fecha (US3, escenario 1). */
export function boardGroups(trip: Pick<TripView, 'items' | 'startDate' | 'endDate'>): BoardGroup[] {
  const byDay = groupByDay(trip.items);
  const days = dayCount(trip.startDate, trip.endDate);
  return [
    { id: UNASSIGNED, day: null, date: null, items: byDay.get(null) ?? [] },
    ...Array.from({ length: days }, (_, day) => ({
      id: groupId(day),
      day,
      date: dayDate(trip.startDate, day),
      items: byDay.get(day) ?? [],
    })),
  ];
}

export interface DropTarget {
  day: number | null;
  index: number;
}

/**
 * Destino de un arrastre con dnd-kit. Sobre un elemento, el arrastrado toma su lugar (la misma regla
 * que `arrayMove`); sobre un grupo, va al final. `null` si se soltó fuera o en el mismo lugar.
 */
export function resolveDrop(
  groups: readonly BoardGroup[],
  activeId: string,
  overId: string,
): DropTarget | null {
  const source = groups.find((group) => group.items.some((item) => item.id === activeId));
  if (!source) return null;
  const from = source.items.findIndex((item) => item.id === activeId);

  const container = groups.find((group) => group.id === overId);
  if (container) {
    const index = container.items.filter((item) => item.id !== activeId).length;
    return container === source && index === from ? null : { day: container.day, index };
  }

  const target = groups.find((group) => group.items.some((item) => item.id === overId));
  if (!target) return null;
  const index = target.items.findIndex((item) => item.id === overId);
  return target === source && index === from ? null : { day: target.day, index };
}

/** Posición del elemento en su grupo, para «Subir», «Bajar» y los anuncios. */
export function locate(
  groups: readonly BoardGroup[],
  itemId: string,
): { group: BoardGroup; index: number } | null {
  for (const group of groups) {
    const index = group.items.findIndex((item) => item.id === itemId);
    if (index !== -1) return { group, index };
  }
  return null;
}
