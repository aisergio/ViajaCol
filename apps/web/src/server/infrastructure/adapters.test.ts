import { describe, expect, it, vi } from 'vitest';
import { createCognitoIdentityAdmin } from './cognito/identity-admin';
import { createDynamoUsersRepository } from './dynamodb/users-repository';

const failure = (name: string) => Object.assign(new Error(name), { name });
const profile = { sub: 'sub-1', displayName: 'Ana', createdAt: 'c', updatedAt: 'u' };

describe('createDynamoUsersRepository', () => {
  it('crea con condición para no pisar un perfil existente', async () => {
    const send = vi.fn().mockResolvedValue({});
    const repo = createDynamoUsersRepository('viajacol-users', 'us-east-2', { send } as never);
    await expect(repo.createIfMissing(profile)).resolves.toEqual(profile);
    expect(send.mock.calls[0]![0].input).toMatchObject({
      TableName: 'viajacol-users',
      Item: profile,
      ConditionExpression: 'attribute_not_exists(#sub)',
    });
  });

  it('si ya existía, devuelve el guardado', async () => {
    const saved = { ...profile, displayName: 'Guardado' };
    const send = vi.fn().mockRejectedValueOnce(failure('ConditionalCheckFailedException')).mockResolvedValueOnce({ Item: saved });
    const repo = createDynamoUsersRepository('t', 'us-east-2', { send } as never);
    await expect(repo.createIfMissing(profile)).resolves.toEqual(saved);
  });

  it('actualiza el nombre solo si el perfil existe', async () => {
    const send = vi.fn().mockRejectedValue(failure('ConditionalCheckFailedException'));
    const repo = createDynamoUsersRepository('t', 'us-east-2', { send } as never);
    await expect(repo.updateDisplayName('sub-1', 'Nuevo', 'u2')).resolves.toBeNull();
    expect(send.mock.calls[0]![0].input).toMatchObject({ Key: { sub: 'sub-1' }, ConditionExpression: 'attribute_exists(#sub)' });
  });

  it('propaga los errores que no son de condición', async () => {
    const send = vi.fn().mockRejectedValue(failure('ProvisionedThroughputExceededException'));
    const repo = createDynamoUsersRepository('t', 'us-east-2', { send } as never);
    await expect(repo.updateDisplayName('sub-1', 'Nuevo', 'u2')).rejects.toThrow('ProvisionedThroughputExceededException');
  });
});

describe('createCognitoIdentityAdmin', () => {
  it('borra por sub en el grupo configurado', async () => {
    const send = vi.fn().mockResolvedValue({});
    await createCognitoIdentityAdmin('us-east-2_abc', 'us-east-2', { send } as never).deleteUser('sub-1');
    expect(send.mock.calls[0]![0].input).toEqual({ UserPoolId: 'us-east-2_abc', Username: 'sub-1' });
  });

  it('un usuario que ya no existe no es un error', async () => {
    const send = vi.fn().mockRejectedValue(failure('UserNotFoundException'));
    await expect(createCognitoIdentityAdmin('p', 'us-east-2', { send } as never).deleteUser('x')).resolves.toBeUndefined();
  });
});
