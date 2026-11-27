import { getAccountServices } from '@/server/account-services';
import { ensureProfile } from '@/server/application/account/use-cases';
import { getAuthConfig } from '@/server/auth/auth';
import { sessionHintCookie } from '@/server/auth/cookies';
import { getSessionUser } from '@/server/auth/session';

const NO_STORE = { 'cache-control': 'private, no-store' };

/**
 * Nombre para el menú de cuenta (contracts/rutas.md). Solo lo pide el navegador cuando existe la
 * cookie indicadora. Sin sesión responde 401 y borra el indicador (research D-05).
 */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request.headers);
    if (!user) {
      const { origin } = await getAuthConfig();
      const response = Response.json({ error: 'sin-sesion' }, { status: 401, headers: NO_STORE });
      response.headers.append('set-cookie', sessionHintCookie('off', origin.startsWith('https://')));
      return response;
    }
    const { users } = await getAccountServices();
    const profile = await ensureProfile(users, user);
    return Response.json({ name: profile.displayName }, { headers: NO_STORE });
  } catch (error) {
    console.error('[cuenta] /api/cuenta/yo falló:', error instanceof Error ? error.message : error);
    return Response.json({ error: 'no-disponible' }, { status: 503, headers: NO_STORE });
  }
}
