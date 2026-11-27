import type { Trip } from '@/domain/trip';

/** El viaje cambió desde que se cargó: la versión guardada no es la esperada (research D-02). */
export class ConflictError extends Error {
  constructor() {
    super('conflicto');
    this.name = 'ConflictError';
  }
}

/** Puerto de persistencia de los viajes. El adaptador de producción es DynamoDB. */
export interface TripsRepository {
  /** Viajes de un usuario. */
  list(sub: string): Promise<Trip[]>;
  /** Un viaje del usuario; `null` si no existe o es de otra persona. */
  get(sub: string, tripId: string): Promise<Trip | null>;
  /** Viaje compartido por su enlace; `null` si no existe o se revocó. */
  getByShareId(shareId: string): Promise<Trip | null>;
  /** Guarda un viaje nuevo (versión 1). Si ya existe uno con ese `tripId`, lanza `ConflictError`. */
  create(trip: Trip): Promise<void>;
  /**
   * Guarda el viaje si la versión guardada es `expectedVersion`, con la versión siguiente. Si no
   * coincide, lanza `ConflictError`.
   */
  save(trip: Trip, expectedVersion: number): Promise<Trip>;
  delete(sub: string, tripId: string): Promise<void>;
}
