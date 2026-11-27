import type { Trip } from '@/domain/trip';
import { ConflictError, type TripsRepository } from './ports';

/**
 * Repositorio en memoria con la misma semántica que el de DynamoDB (versión y dueño). Lo usan las
 * pruebas de los casos de uso y de las Server Actions.
 */
export function createMemoryTripsRepository(initial: Trip[] = []) {
  const items = new Map(
    initial.map((trip) => [`${trip.sub}#${trip.tripId}`, structuredClone(trip)]),
  );
  const key = (sub: string, tripId: string) => `${sub}#${tripId}`;

  const repo: TripsRepository & { items: Map<string, Trip> } = {
    items,
    async list(sub) {
      return [...items.values()]
        .filter((trip) => trip.sub === sub)
        .map((trip) => structuredClone(trip));
    },
    async get(sub, tripId) {
      const trip = items.get(key(sub, tripId));
      return trip ? structuredClone(trip) : null;
    },
    async getByShareId(shareId) {
      const trip = [...items.values()].find((candidate) => candidate.shareId === shareId);
      return trip ? structuredClone(trip) : null;
    },
    async create(trip) {
      if (items.has(key(trip.sub, trip.tripId))) throw new ConflictError();
      items.set(key(trip.sub, trip.tripId), structuredClone(trip));
    },
    async save(trip, expectedVersion) {
      const current = items.get(key(trip.sub, trip.tripId));
      if (!current || current.version !== expectedVersion) throw new ConflictError();
      const saved = { ...structuredClone(trip), version: expectedVersion + 1 };
      items.set(key(trip.sub, trip.tripId), saved);
      return structuredClone(saved);
    },
    async delete(sub, tripId) {
      items.delete(key(sub, tripId));
    },
  };
  return repo;
}
