import 'server-only';

/**
 * Configuración de la cuenta (research D-07). Los identificadores públicos llegan por variables de
 * entorno; los dos secretos, desde SSM Parameter Store (en Lambda) o desde `.env.local` (en local).
 */
export interface AuthConfig {
  /** Origen público, sin ruta: `https://aisergio.dev`. */
  origin: string;
  /** Clave que firma y cifra la sesión. */
  secret: string;
  region: string;
  cognito: { userPoolId: string; clientId: string; clientSecret: string; domain: string };
  usersTable: string;
}

export type ParameterFetcher = (names: string[], region: string) => Promise<Record<string, string>>;

export class AuthConfigError extends Error {
  constructor(readonly missing: string[]) {
    super(`Falta configuración de la cuenta: ${missing.join(', ')}`);
    this.name = 'AuthConfigError';
  }
}

const MIN_SECRET_LENGTH = 32;

/** Lee los parámetros cifrados de SSM con la clave administrada `aws/ssm`. */
export const fetchSsmParameters: ParameterFetcher = async (names, region) => {
  const { SSMClient, GetParametersCommand } = await import('@aws-sdk/client-ssm');
  const client = new SSMClient({ region });
  const result = await client.send(new GetParametersCommand({ Names: names, WithDecryption: true }));
  if (result.InvalidParameters?.length) throw new AuthConfigError(result.InvalidParameters);
  return Object.fromEntries((result.Parameters ?? []).map((p) => [p.Name ?? '', p.Value ?? '']));
};

export async function loadAuthConfig(
  env: Record<string, string | undefined> = process.env,
  fetchParameters: ParameterFetcher = fetchSsmParameters,
): Promise<AuthConfig> {
  const region = env.AWS_REGION ?? 'us-east-2';
  const required = ['AUTH_ORIGIN', 'COGNITO_USER_POOL_ID', 'COGNITO_CLIENT_ID', 'COGNITO_DOMAIN', 'USERS_TABLE'];
  const missing = required.filter((name) => !env[name]);

  // Cada secreto puede venir directo (local) o por el nombre de su parámetro en SSM (Lambda).
  const secretSources = [
    { value: 'AUTH_SECRET', param: 'AUTH_SECRET_PARAM' },
    { value: 'COGNITO_CLIENT_SECRET', param: 'COGNITO_SECRET_PARAM' },
  ];
  for (const source of secretSources) {
    if (!env[source.value] && !env[source.param]) missing.push(`${source.value} o ${source.param}`);
  }
  if (missing.length) throw new AuthConfigError(missing);

  const toFetch = secretSources.filter((s) => !env[s.value]).map((s) => env[s.param] as string);
  const fetched = toFetch.length ? await fetchParameters(toFetch, region) : {};
  const secretOf = (s: (typeof secretSources)[number]) => env[s.value] ?? fetched[env[s.param] as string] ?? '';
  const secret = secretOf(secretSources[0]!);
  const clientSecret = secretOf(secretSources[1]!);

  const invalid: string[] = [];
  if (secret.length < MIN_SECRET_LENGTH) invalid.push(`AUTH_SECRET (mínimo ${MIN_SECRET_LENGTH} caracteres)`);
  if (!clientSecret) invalid.push('COGNITO_CLIENT_SECRET');
  const origin = env.AUTH_ORIGIN as string;
  if (new URL(origin).pathname !== '/') invalid.push('AUTH_ORIGIN (solo origen, sin ruta)');
  if (invalid.length) throw new AuthConfigError(invalid);

  return {
    origin: new URL(origin).origin,
    secret,
    region,
    cognito: {
      userPoolId: env.COGNITO_USER_POOL_ID as string,
      clientId: env.COGNITO_CLIENT_ID as string,
      clientSecret,
      domain: env.COGNITO_DOMAIN as string,
    },
    usersTable: env.USERS_TABLE as string,
  };
}
