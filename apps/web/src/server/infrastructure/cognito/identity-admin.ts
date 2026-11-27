import 'server-only';
import { AdminDeleteUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { IdentityAdmin } from '@/server/application/account/ports';

type CognitoClient = Pick<CognitoIdentityProviderClient, 'send'>;

/**
 * Adaptador de Cognito. Con el correo como atributo de usuario, el nombre de usuario interno es el
 * `sub`, así que `AdminDeleteUser` lo recibe directamente (research D-08).
 */
export function createCognitoIdentityAdmin(userPoolId: string, region: string, client?: CognitoClient): IdentityAdmin {
  const cognito = client ?? new CognitoIdentityProviderClient({ region });
  return {
    async deleteUser(sub) {
      try {
        await cognito.send(new AdminDeleteUserCommand({ UserPoolId: userPoolId, Username: sub }));
      } catch (error) {
        if ((error as { name?: string } | null)?.name === 'UserNotFoundException') return;
        throw error;
      }
    },
  };
}
