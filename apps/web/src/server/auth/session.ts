import 'server-only';
import { headers as nextHeaders } from 'next/headers';
import { getAuth } from './auth';

/** Lo que el servidor sabe del usuario con sesión. `sub` es la identidad estable (Cognito). */
export interface SessionUser {
  sub: string;
  email: string;
  name: string;
}

/**
 * Usuario de la sesión, o `null` si no hay sesión o si la cookie está alterada o vencida. Es la única
 * fuente de identidad de los casos de uso: el `sub` nunca viene del navegador (FR-009).
 */
export async function getSessionUser(requestHeaders?: Headers): Promise<SessionUser | null> {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: requestHeaders ?? (await nextHeaders()) });
  const sub = session?.user.cognitoSub;
  if (!session || !sub) return null;
  return { sub, email: session.user.email, name: session.user.name };
}
