import 'server-only';
import type { IdentityAdmin, UsersRepository } from '@/server/application/account/ports';
import { getAuthConfig } from '@/server/auth/auth';
import { createCognitoIdentityAdmin } from '@/server/infrastructure/cognito/identity-admin';
import { createDynamoUsersRepository } from '@/server/infrastructure/dynamodb/users-repository';

export interface AccountServices {
  users: UsersRepository;
  identity: IdentityAdmin;
}

let services: Promise<AccountServices> | undefined;

/** Adaptadores de producción de la cuenta, creados una vez por instancia. */
export function getAccountServices(): Promise<AccountServices> {
  services ??= getAuthConfig()
    .then((config) => ({
      users: createDynamoUsersRepository(config.usersTable, config.region),
      identity: createCognitoIdentityAdmin(config.cognito.userPoolId, config.region),
    }))
    .catch((error: unknown) => {
      services = undefined;
      throw error;
    });
  return services;
}
