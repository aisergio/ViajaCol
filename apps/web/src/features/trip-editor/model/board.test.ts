import { describe, expect, it } from 'vitest';
import { type TripView, addCatalogItem, moveItem, newTrip, toTripView } from '@/domain/trip';
import { UNASSIGNED, boardGroups, groupId, locate, resolveDrop } from './board';

const now = new Date('2026-11-27T15:00:00.000Z');
const details = {
  name: 'Eje cafetero',
  startDate: '2026-12-20',
  endDate: '2026-12-22',
  travelers: 2,
  budget: 0,
};

/** Viaje de 3 días: a y b en «Sin día», c y d en el día 1 (índice 0). */
function trip(): TripView {
  let value = toTripView(newTrip({ sub: 'sub-ana', tripId: 'viaje-1', details, now }));
  for (const id of ['a', 'b', 'c', 'd'])
    value = addCatalogItem(value, { id, kind: 'sitio', slug: `sitio-${id}`, title: id }, now);
  value = moveItem(value, 'c', 0, 0, now);
  return moveItem(value, 'd', 0, 1, now);
}

const ids = (items: readonly { id: string }[]) => items.map((item) => item.id);

describe('boardGroups', () => {
  it('pone «Sin día» primero y un grupo por fecha (US3, escenario 1)', () => {
    const groups = boardGroups(trip());
    expect(groups.map((group) => [group.id, group.date])).toEqual([
      [UNASSIGNED, null],
      ['dia-0', '2026-12-20'],
      ['dia-1', '2026-12-21'],
      ['dia-2', '2026-12-22'],
    ]);
    expect(ids(groups[0]!.items)).toEqual(['a', 'b']);
    expect(ids(groups[1]!.items)).toEqual(['c', 'd']);
    expect(groupId(null)).toBe(UNASSIGNED);
    expect(groupId(2)).toBe('dia-2');
  });
});

describe('resolveDrop', () => {
  const groups = boardGroups(trip());

  it('sobre otro elemento toma su lugar, en el mismo grupo o en otro', () => {
    expect(resolveDrop(groups, 'a', 'd')).toEqual({ day: 0, index: 1 });
    expect(resolveDrop(groups, 'd', 'c')).toEqual({ day: 0, index: 0 });
    expect(resolveDrop(groups, 'c', 'b')).toEqual({ day: null, index: 1 });
  });

  it('sobre un grupo va al final, sin contarse a sí mismo', () => {
    expect(resolveDrop(groups, 'a', 'dia-2')).toEqual({ day: 2, index: 0 });
    expect(resolveDrop(groups, 'a', 'dia-0')).toEqual({ day: 0, index: 2 });
    expect(resolveDrop(groups, 'a', UNASSIGNED)).toEqual({ day: null, index: 1 });
  });

  it('soltar en el mismo lugar o fuera no hace nada', () => {
    expect(resolveDrop(groups, 'a', 'a')).toBeNull();
    expect(resolveDrop(groups, 'b', UNASSIGNED)).toBeNull();
    expect(resolveDrop(groups, 'a', 'no-existe')).toBeNull();
    expect(resolveDrop(groups, 'no-existe', 'a')).toBeNull();
  });

  it('el destino aplicado con el dominio deja el orden esperado', () => {
    const target = resolveDrop(groups, 'a', 'd');
    const next = moveItem(trip(), 'a', target!.day, target!.index, now);
    expect(ids(boardGroups(next)[1]!.items)).toEqual(['c', 'a', 'd']);
  });
});

describe('locate', () => {
  it('encuentra el grupo y la posición', () => {
    const groups = boardGroups(trip());
    expect(locate(groups, 'd')).toMatchObject({ index: 1, group: { id: 'dia-0' } });
    expect(locate(groups, 'x')).toBeNull();
  });
});
