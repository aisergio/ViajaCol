import 'server-only';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { ConflictError, type TripsRepository } from '@/server/application/trips/ports';
import type { Trip } from '@/domain/trip';

type DocumentClient = Pick<DynamoDBDocumentClient, 'send'>;

export const SHARE_INDEX = 'shareId-index';

const isConditionFailure = (error: unknown) =>
  (error as { name?: string } | null)?.name === 'ConditionalCheckFailedException';

/** Los campos opcionales nulos no se guardan: una clave de índice no puede ser nula. */
function toItem(trip: Trip): Record<string, unknown> {
  const { shareId, migrationId, ...rest } = trip;
  return { ...rest, ...(shareId ? { shareId } : {}), ...(migrationId ? { migrationId } : {}) };
}

function fromItem(item: Record<string, unknown> | undefined): Trip | null {
  if (!item) return null;
  return {
    shareId: null,
    migrationId: null,
    ...(item as Omit<Trip, 'shareId' | 'migrationId'>),
  } as Trip;
}

/** Adaptador de DynamoDB para los viajes (research D-01): `sub` + `tripId` e índice por `shareId`. */
export function createDynamoTripsRepository(
  tableName: string,
  region: string,
  client?: DocumentClient,
): TripsRepository {
  const doc = client ?? DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

  return {
    async list(sub) {
      const trips: Trip[] = [];
      let startKey: Record<string, unknown> | undefined;
      do {
        const page = await doc.send(
          new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: '#sub = :sub',
            ExpressionAttributeNames: { '#sub': 'sub' },
            ExpressionAttributeValues: { ':sub': sub },
            ExclusiveStartKey: startKey,
          }),
        );
        for (const item of page.Items ?? []) trips.push(fromItem(item) as Trip);
        startKey = page.LastEvaluatedKey;
      } while (startKey);
      return trips;
    },
    async get(sub, tripId) {
      const result = await doc.send(
        new GetCommand({ TableName: tableName, Key: { sub, tripId }, ConsistentRead: true }),
      );
      return fromItem(result.Item);
    },
    async getByShareId(shareId) {
      const result = await doc.send(
        new QueryCommand({
          TableName: tableName,
          IndexName: SHARE_INDEX,
          KeyConditionExpression: '#shareId = :shareId',
          ExpressionAttributeNames: { '#shareId': 'shareId' },
          ExpressionAttributeValues: { ':shareId': shareId },
          Limit: 1,
        }),
      );
      return fromItem(result.Items?.[0]);
    },
    async create(trip) {
      try {
        await doc.send(
          new PutCommand({
            TableName: tableName,
            Item: toItem(trip),
            ConditionExpression: 'attribute_not_exists(tripId)',
          }),
        );
      } catch (error) {
        if (isConditionFailure(error)) throw new ConflictError();
        throw error;
      }
    },
    async save(trip, expectedVersion) {
      const saved: Trip = { ...trip, version: expectedVersion + 1 };
      try {
        await doc.send(
          new PutCommand({
            TableName: tableName,
            Item: toItem(saved),
            ConditionExpression: '#version = :expected',
            ExpressionAttributeNames: { '#version': 'version' },
            ExpressionAttributeValues: { ':expected': expectedVersion },
          }),
        );
        return saved;
      } catch (error) {
        if (isConditionFailure(error)) throw new ConflictError();
        throw error;
      }
    },
    async delete(sub, tripId) {
      await doc.send(new DeleteCommand({ TableName: tableName, Key: { sub, tripId } }));
    },
  };
}
