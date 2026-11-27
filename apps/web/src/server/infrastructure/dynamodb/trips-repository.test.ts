import { describe, expect, it, vi } from 'vitest';
import { ConflictError } from '@/server/application/trips/ports';
import { newTrip } from '@/domain/trip';
import { createDynamoTripsRepository } from './trips-repository';

const failure = (name: string) => Object.assign(new Error(name), { name });
const trip = newTrip({
  sub: 'sub-1',
  tripId: 'viaje-1',
  details: {
    name: 'Caribe',
    startDate: '2026-12-20',
    endDate: '2026-12-22',
    travelers: 2,
    budget: 0,
  },
  now: new Date('2026-11-27T15:00:00Z'),
});

describe('createDynamoTripsRepository', () => {
  it('guarda con la condición de versión y sin claves nulas del índice', async () => {
    const send = vi.fn().mockResolvedValue({});
    const repo = createDynamoTripsRepository('viajacol-trips', 'us-east-2', { send } as never);
    const saved = await repo.save(trip, 1);
    expect(saved.version).toBe(2);
    const input = send.mock.calls[0]![0].input;
    expect(input).toMatchObject({
      TableName: 'viajacol-trips',
      ConditionExpression: '#version = :expected',
      ExpressionAttributeValues: { ':expected': 1 },
    });
    expect(input.Item).toMatchObject({ sub: 'sub-1', tripId: 'viaje-1', version: 2 });
    expect('shareId' in input.Item).toBe(false);
    expect('migrationId' in input.Item).toBe(false);
  });

  it('una versión que no coincide es un conflicto', async () => {
    const send = vi.fn().mockRejectedValue(failure('ConditionalCheckFailedException'));
    const repo = createDynamoTripsRepository('t', 'us-east-2', { send } as never);
    await expect(repo.save(trip, 1)).rejects.toBeInstanceOf(ConflictError);
    await expect(repo.create(trip)).rejects.toBeInstanceOf(ConflictError);
  });

  it('busca un enlace compartido por el índice y completa los campos opcionales', async () => {
    const send = vi.fn().mockResolvedValue({ Items: [{ ...trip, shareId: 'abc' }] });
    const repo = createDynamoTripsRepository('t', 'us-east-2', { send } as never);
    const found = await repo.getByShareId('abc');
    expect(found).toMatchObject({ shareId: 'abc', migrationId: null });
    expect(send.mock.calls[0]![0].input).toMatchObject({ IndexName: 'shareId-index', Limit: 1 });
  });

  it('lista todas las páginas de un usuario', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        Items: [trip],
        LastEvaluatedKey: { sub: 'sub-1', tripId: 'viaje-1' },
      })
      .mockResolvedValueOnce({ Items: [{ ...trip, tripId: 'viaje-2' }] });
    const repo = createDynamoTripsRepository('t', 'us-east-2', { send } as never);
    expect((await repo.list('sub-1')).map((t) => t.tripId)).toEqual(['viaje-1', 'viaje-2']);
    expect(send.mock.calls[1]![0].input.ExclusiveStartKey).toEqual({
      sub: 'sub-1',
      tripId: 'viaje-1',
    });
  });
});
