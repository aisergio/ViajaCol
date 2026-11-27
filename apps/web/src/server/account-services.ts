import 'server-only';
import type { IdentityAdmin, UsersRepository } from '@/server/application/account/ports';
import type { TripsRepository } from '@/server/application/trips/ports';
import { getAuthConfig } from '@/server/auth/auth';
import { createCognitoIdentityAdmin } from '@/server/infrastructure/cognito/identity-admin';
import { createDynamoTripsRepository } from '@/server/infrastructure/dynamodb/trips-repository';
import { createDynamoUsersRepository } from '@/server/infrastructure/dynamodb/users-repository';

export interface AccountServices {
  users: UsersRepository;
  identity: IdentityAdmin;
  trips: TripsRepository;
}

let services: Promise<AccountServices> | undefined;

/** Adaptadores de producción de la cuenta y de «Mi viaje», creados una vez por instancia. */
export function getAccountServices(): Promise<AccountServices> {
  services ??= getAuthConfig()
    .then((config) => ({
      users: createDynamoUsersRepository(config.usersTable, config.region),
      identity: createCognitoIdentityAdmin(config.cognito.userPoolId, config.region),
      trips: createDynamoTripsRepository(config.tripsTable, config.region),
    }))
    .catch((error: unknown) => {
      services = undefined;
      throw error;
    });
  return services;
}
