import { resolveLocale } from '@/i18n/locale';
import { getAuth, getAuthConfig } from '@/server/auth/auth';
import { sessionHintCookie } from '@/server/auth/cookies';
import { homeFor, safeReturnPath } from '@/server/auth/return-path';

type Context = { params: Promise<{ locale: string }> };

const NO_STORE = 'private, no-store';

/**
 * «Entrar» (contracts/rutas.md): redirige a la pantalla de Cognito en el idioma de la página. Es un
 * enlace normal, así que funciona sin JavaScript (research D-04). Deja la cookie indicadora: si el
 * usuario cancela, la primera consulta del encabezado recibe 401 y la borra (research D-05).
 */
export async function GET(request: Request, { params }: Context) {
  const locale = resolveLocale((await params).locale);
  const volver = safeReturnPath(new URL(request.url).searchParams.get('volver'), locale);
  const errorPath = `${homeFor(locale)}/entrar/error`;

  try {
    const [auth, config] = await Promise.all([getAuth(), getAuthConfig()]);
    const result = await auth.api.signInSocial({
      body: { provider: 'cognito', callbackURL: volver, errorCallbackURL: errorPath, additionalParams: { lang: locale } },
      headers: request.headers,
      asResponse: true,
    });
    const { url } = (await result.json()) as { url?: string };
    if (!result.ok || !url) throw new Error(`signInSocial respondió ${result.status}`);

    const response = new Response(null, { status: 302, headers: { location: url, 'cache-control': NO_STORE } });
    for (const cookie of result.headers.getSetCookie()) response.headers.append('set-cookie', cookie);
    response.headers.append('set-cookie', sessionHintCookie('on', config.origin.startsWith('https://')));
    return response;
  } catch (error) {
    console.error('[cuenta] no se pudo iniciar la entrada:', error instanceof Error ? error.message : error);
    return new Response(null, { status: 302, headers: { location: errorPath, 'cache-control': NO_STORE } });
  }
}
