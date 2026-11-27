import 'server-only';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Profile, UsersRepository } from '@/server/application/account/ports';

type DocumentClient = Pick<DynamoDBDocumentClient, 'send'>;

const isConditionFailure = (error: unknown) =>
  (error as { name?: string } | null)?.name === 'ConditionalCheckFailedException';

/** Adaptador de DynamoDB para el perfil: tabla `viajacol-users`, clave de partición `sub`. */
export function createDynamoUsersRepository(
  tableName: string,
  region: string,
  client?: DocumentClient,
): UsersRepository {
  const doc = client ?? DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
  const names = { '#sub': 'sub' };

  const get = async (sub: string): Promise<Profile | null> => {
    const result = await doc.send(
      new GetCommand({ TableName: tableName, Key: { sub }, ConsistentRead: true }),
    );
    return (result.Item as Profile | undefined) ?? null;
  };

  return {
    get,
    async createIfMissing(profile) {
      try {
        await doc.send(
          new PutCommand({
            TableName: tableName,
            Item: profile,
            ConditionExpression: 'attribute_not_exists(#sub)',
            ExpressionAttributeNames: names,
          }),
        );
        return profile;
      } catch (error) {
        if (!isConditionFailure(error)) throw error;
        const existing = await get(profile.sub);
        if (!existing) throw error;
        return existing;
      }
    },
    async updateDisplayName(sub, displayName, updatedAt) {
      try {
        const result = await doc.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { sub },
            UpdateExpression: 'SET displayName = :name, updatedAt = :updatedAt',
            ConditionExpression: 'attribute_exists(#sub)',
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: { ':name': displayName, ':updatedAt': updatedAt },
            ReturnValues: 'ALL_NEW',
          }),
        );
        return (result.Attributes as Profile | undefined) ?? null;
      } catch (error) {
        if (isConditionFailure(error)) return null;
        throw error;
      }
    },
    async delete(sub) {
      await doc.send(new DeleteCommand({ TableName: tableName, Key: { sub } }));
    },
  };
}
