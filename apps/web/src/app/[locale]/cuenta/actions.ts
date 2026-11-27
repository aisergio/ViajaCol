'use server';

import { cookies } from 'next/headers';
import { redirect } from '@/i18n/navigation';
import { getAccountServices } from '@/server/account-services';
import { deleteAccount, updateDisplayName } from '@/server/application/account/use-cases';
import { getAuthConfig } from '@/server/auth/auth';
import { SESSION_HINT_COOKIE, sessionCookieNames } from '@/server/auth/cookies';
import { BASE_PATH } from '@/server/auth/return-path';
import { getSessionUser } from '@/server/auth/session';

export type NameFormState =
  | { status: 'idle' }
  | { status: 'ok'; name: string }
  | { status: 'error'; error: 'nombre-invalido' | 'sin-sesion' | 'no-disponible' };

export type DeleteFormState = { status: 'idle' } | { status: 'error'; error: 'confirmacion' | 'sin-sesion' | 'no-disponible' };

/**
 * Cambia el nombre visible (US4, FR-010). La Server Action es un endpoint público: verifica la sesión
 * y valida la entrada dentro de sí misma, y el `sub` sale de la sesión (FR-009).
 */
export async function actualizarNombre(_previous: NameFormState, formData: FormData): Promise<NameFormState> {
  const user = await getSessionUser();
  if (!user) return { status: 'error', error: 'sin-sesion' };
  try {
    const { users } = await getAccountServices();
    const result = await updateDisplayName(users, user, formData.get('nombre'));
    return result.ok ? { status: 'ok', name: result.profile.displayName } : { status: 'error', error: result.error };
  } catch (error) {
    console.error('[cuenta] actualizarNombre falló:', error instanceof Error ? error.message : error);
    return { status: 'error', error: 'no-disponible' };
  }
}

/** Elimina la cuenta tras la confirmación escrita (US5, FR-011) y cierra la sesión. */
export async function eliminarCuenta(locale: string, _previous: DeleteFormState, formData: FormData): Promise<DeleteFormState> {
  const user = await getSessionUser();
  if (!user) return { status: 'error', error: 'sin-sesion' };
  if (formData.get('confirmar') !== 'eliminar') return { status: 'error', error: 'confirmacion' };

  try {
    const { users, identity } = await getAccountServices();
    await deleteAccount(users, identity, user);
  } catch (error) {
    console.error('[cuenta] eliminarCuenta falló:', error instanceof Error ? error.message : error);
    return { status: 'error', error: 'no-disponible' };
  }

  const { origin } = await getAuthConfig();
  const secure = origin.startsWith('https://');
  const jar = await cookies();
  for (const name of sessionCookieNames(secure)) jar.set(name, '', { path: BASE_PATH, maxAge: 0, httpOnly: true, sameSite: 'lax', secure });
  jar.set(SESSION_HINT_COOKIE, '', { path: BASE_PATH, maxAge: 0, sameSite: 'lax', secure });
  redirect({ href: '/cuenta/eliminada', locale: locale === 'en' ? 'en' : 'es' });
  return { status: 'idle' };
}
