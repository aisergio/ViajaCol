import 'server-only';
import { betterAuth } from 'better-auth';
import { type AuthConfig, loadAuthConfig } from './config';
import { COOKIE_PREFIX, SESSION_MAX_AGE_S } from './cookies';
import { BASE_PATH } from './return-path';

/**
 * Ruta completa de Better Auth. Next.js le quita el `basePath` a la URL de los Route Handlers, así que
 * el `baseURL` va sin ruta y el `basePath` de Better Auth lleva `/ViajaCol` (research D-02).
 */
export const AUTH_BASE_PATH = `${BASE_PATH}/api/auth`;

/** Better Auth sin base de datos: la sesión vive en cookies cifradas (research D-03). */
export function createAuth(config: AuthConfig) {
  return betterAuth({
    appName: 'Viaja Colombia',
    baseURL: config.origin,
    basePath: AUTH_BASE_PATH,
    secret: config.secret,
    trustedOrigins: [config.origin],
    session: {
      expiresIn: SESSION_MAX_AGE_S,
      cookieCache: {
        enabled: true,
        maxAge: SESSION_MAX_AGE_S,
        strategy: 'jwe',
        refreshCache: true,
      },
    },
    // Sin base de datos el estado del flujo va en una cookie; los tokens de Cognito no se guardan.
    account: { storeStateStrategy: 'cookie', storeAccountCookie: false },
    // El id que genera Better Auth cambia en cada inicio de sesión: la identidad estable es el sub.
    user: { additionalFields: { cognitoSub: { type: 'string', required: false, input: false } } },
    socialProviders: {
      cognito: {
        clientId: config.cognito.clientId,
        clientSecret: config.cognito.clientSecret,
        domain: config.cognito.domain,
        region: config.region,
        userPoolId: config.cognito.userPoolId,
        mapProfileToUser: (profile) => ({
          cognitoSub: profile.sub,
          name: profile.name?.trim() || profile.email?.split('@')[0] || 'Viajero',
        }),
      },
    },
    advanced: {
      cookiePrefix: COOKIE_PREFIX,
      useSecureCookies: config.origin.startsWith('https://'),
      defaultCookieAttributes: { path: BASE_PATH, sameSite: 'lax' },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

let configPromise: Promise<AuthConfig> | undefined;
let authPromise: Promise<Auth> | undefined;

/** Configuración cargada una vez por instancia (SSM se consulta solo al arrancar). */
export function getAuthConfig(): Promise<AuthConfig> {
  configPromise ??= loadAuthConfig().catch((error: unknown) => {
    configPromise = undefined;
    throw error;
  });
  return configPromise;
}

export function getAuth(): Promise<Auth> {
  authPromise ??= getAuthConfig()
    .then(createAuth)
    .catch((error: unknown) => {
      authPromise = undefined;
      throw error;
    });
  return authPromise;
}
