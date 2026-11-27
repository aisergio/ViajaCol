import { describe, expect, it, vi } from 'vitest';
import { AuthConfigError, loadAuthConfig } from './config';

const base = {
  AUTH_ORIGIN: 'https://aisergio.dev',
  COGNITO_USER_POOL_ID: 'us-east-2_abc',
  COGNITO_CLIENT_ID: 'cliente',
  COGNITO_DOMAIN: 'viajacol-1234.auth.us-east-2.amazoncognito.com',
  USERS_TABLE: 'viajacol-users',
  TRIPS_TABLE: 'viajacol-trips',
};
const secret = 'x'.repeat(48);

describe('loadAuthConfig', () => {
  it('en local toma los secretos de las variables', async () => {
    const fetcher = vi.fn();
    const config = await loadAuthConfig(
      { ...base, AUTH_SECRET: secret, COGNITO_CLIENT_SECRET: 'cs' },
      fetcher,
    );
    expect(fetcher).not.toHaveBeenCalled();
    expect(config).toMatchObject({
      origin: 'https://aisergio.dev',
      secret,
      region: 'us-east-2',
      usersTable: 'viajacol-users',
      tripsTable: 'viajacol-trips',
    });
    expect(config.cognito).toEqual({
      userPoolId: 'us-east-2_abc',
      clientId: 'cliente',
      clientSecret: 'cs',
      domain: base.COGNITO_DOMAIN,
    });
  });

  it('en Lambda los pide a SSM por nombre, en una sola llamada', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      '/viajacol/web/auth-secret': secret,
      '/viajacol/web/cognito-client-secret': 'cs',
    });
    const config = await loadAuthConfig(
      {
        ...base,
        AWS_REGION: 'us-east-2',
        AUTH_SECRET_PARAM: '/viajacol/web/auth-secret',
        COGNITO_SECRET_PARAM: '/viajacol/web/cognito-client-secret',
      },
      fetcher,
    );
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith(
      ['/viajacol/web/auth-secret', '/viajacol/web/cognito-client-secret'],
      'us-east-2',
    );
    expect(config.secret).toBe(secret);
    expect(config.cognito.clientSecret).toBe('cs');
  });

  it('nombra lo que falta sin mostrar valores', async () => {
    await expect(
      loadAuthConfig({ AUTH_ORIGIN: 'https://aisergio.dev' }, vi.fn()),
    ).rejects.toMatchObject({
      name: 'AuthConfigError',
      missing: expect.arrayContaining([
        'COGNITO_USER_POOL_ID',
        'USERS_TABLE',
        'AUTH_SECRET o AUTH_SECRET_PARAM',
      ]),
    });
  });

  it('rechaza una clave corta y un origen con ruta', async () => {
    const error = await loadAuthConfig(
      {
        ...base,
        AUTH_ORIGIN: 'https://aisergio.dev/ViajaCol',
        AUTH_SECRET: 'corta',
        COGNITO_CLIENT_SECRET: 'cs',
      },
      vi.fn(),
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthConfigError);
    expect((error as AuthConfigError).missing).toEqual([
      'AUTH_SECRET (mínimo 32 caracteres)',
      'AUTH_ORIGIN (solo origen, sin ruta)',
    ]);
  });
});
