import 'server-only';
import { cache } from 'react';
import type { Trip } from '@/domain/trip';
import { getAccountServices } from '@/server/account-services';

/** `shareId`: 16 bytes aleatorios en base64url, sin relleno (research D-07). */
export const SHARE_ID = /^[A-Za-z0-9_-]{22}$/;

/**
 * Viaje compartido por su enlace, o `null` si el enlace no existe o se revocó. Un identificador mal
 * formado ni siquiera consulta la base de datos. Se pide una vez por petición.
 */
export const loadSharedTrip = cache(async (shareId: string): Promise<Trip | null> => {
  if (!SHARE_ID.test(shareId)) return null;
  const { trips } = await getAccountServices();
  return trips.getByShareId(shareId);
});
