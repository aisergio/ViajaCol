import { z } from 'zod';
import type { IdentityAdmin, Profile, UsersRepository } from './ports';

/** Identidad mínima que exigen los casos de uso; sale siempre de la sesión. */
export interface AccountUser {
  sub: string;
  email: string;
  name: string;
}

export const DISPLAY_NAME_MAX = 50;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/** Nombre visible: de 1 a 50 caracteres después de quitar espacios a los lados. */
export const displayNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(DISPLAY_NAME_MAX)
  .refine((value) => !CONTROL_CHARS.test(value));

/** Nombre inicial: el de Cognito o la parte local del correo, recortado al máximo permitido. */
export function initialDisplayName(user: AccountUser): string {
  const candidate = displayNameSchema.safeParse(user.name);
  if (candidate.success) return candidate.data;
  const local = user.email.split('@')[0]?.trim() ?? '';
  return displayNameSchema.safeParse(local.slice(0, DISPLAY_NAME_MAX)).data ?? 'Viajero';
}

/** Devuelve el perfil del usuario y lo crea la primera vez (research D-06). */
export async function ensureProfile(repo: UsersRepository, user: AccountUser, now = new Date()): Promise<Profile> {
  const existing = await repo.get(user.sub);
  if (existing) return existing;
  const stamp = now.toISOString();
  return repo.createIfMissing({ sub: user.sub, displayName: initialDisplayName(user), createdAt: stamp, updatedAt: stamp });
}

export type UpdateDisplayNameResult = { ok: true; profile: Profile } | { ok: false; error: 'nombre-invalido' };

export async function updateDisplayName(
  repo: UsersRepository,
  user: AccountUser,
  rawName: unknown,
  now = new Date(),
): Promise<UpdateDisplayNameResult> {
  const parsed = displayNameSchema.safeParse(rawName);
  if (!parsed.success) return { ok: false, error: 'nombre-invalido' };
  await ensureProfile(repo, user, now);
  const profile = await repo.updateDisplayName(user.sub, parsed.data, now.toISOString());
  if (!profile) return { ok: false, error: 'nombre-invalido' };
  return { ok: true, profile };
}

/**
 * Elimina la cuenta: primero el usuario en el proveedor (así ya no puede entrar) y luego el perfil.
 * Si el proveedor falla, no se borra nada.
 */
export async function deleteAccount(repo: UsersRepository, identity: IdentityAdmin, user: AccountUser): Promise<void> {
  await identity.deleteUser(user.sub);
  await repo.delete(user.sub);
}
