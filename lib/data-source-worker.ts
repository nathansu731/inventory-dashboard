import crypto from "crypto"
import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb"

const encodeNextToken = (key?: Record<string, AttributeValue>) => {
  if (!key) return null
  return Buffer.from(JSON.stringify(key), "utf8").toString("base64")
}

const decodeNextToken = (token: string | null | undefined): Record<string, AttributeValue> | undefined => {
  if (!token) return undefined
  try {
    return JSON.parse(Buffer.from(token, "base64").toString("utf8")) as Record<string, AttributeValue>
  } catch {
    return undefined
  }
}

export const makeWorkerOwnerId = () => `worker-${Date.now()}-${crypto.randomUUID()}`

export const listTenantIdsPage = async ({
  ddb,
  tableName,
  limit,
  nextToken,
}: {
  ddb: DynamoDBClient
  tableName: string
  limit: number
  nextToken?: string | null
}) => {
  const result = await ddb.send(
    new ScanCommand({
      TableName: tableName,
      ProjectionExpression: "tenantId",
      Limit: Math.max(1, Math.min(100, limit)),
      ExclusiveStartKey: decodeNextToken(nextToken),
    })
  )

  const tenantIds = (result.Items ?? [])
    .map((item) => item.tenantId?.S || "")
    .filter(Boolean)

  return {
    tenantIds,
    nextToken: encodeNextToken(result.LastEvaluatedKey as Record<string, AttributeValue> | undefined),
  }
}

export const acquireTenantSyncLock = async ({
  ddb,
  tableName,
  tenantId,
  owner,
  ttlSeconds = 300,
}: {
  ddb: DynamoDBClient
  tableName: string
  tenantId: string
  owner: string
  ttlSeconds?: number
}) => {
  const nowEpoch = Math.floor(Date.now() / 1000)
  const expiresAt = nowEpoch + Math.max(30, ttlSeconds)

  try {
    await ddb.send(
      new UpdateItemCommand({
        TableName: tableName,
        Key: {
          tenantId: { S: tenantId },
        },
        UpdateExpression: "SET syncLock = :lock",
        ConditionExpression:
          "attribute_not_exists(syncLock.expiresAt) OR syncLock.expiresAt < :now OR syncLock.owner = :owner",
        ExpressionAttributeValues: {
          ":lock": {
            M: {
              owner: { S: owner },
              acquiredAt: { N: String(nowEpoch) },
              expiresAt: { N: String(expiresAt) },
            },
          },
          ":now": { N: String(nowEpoch) },
          ":owner": { S: owner },
        },
      })
    )
    return true
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) return false
    throw error
  }
}

export const releaseTenantSyncLock = async ({
  ddb,
  tableName,
  tenantId,
  owner,
}: {
  ddb: DynamoDBClient
  tableName: string
  tenantId: string
  owner: string
}) => {
  try {
    await ddb.send(
      new UpdateItemCommand({
        TableName: tableName,
        Key: {
          tenantId: { S: tenantId },
        },
        UpdateExpression: "REMOVE syncLock",
        ConditionExpression: "syncLock.owner = :owner",
        ExpressionAttributeValues: {
          ":owner": { S: owner },
        },
      })
    )
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) return
    throw error
  }
}

export const acquireSourceSyncLock = async ({
  ddb,
  tableName,
  tenantId,
  sourceId,
  owner,
  ttlSeconds = 180,
}: {
  ddb: DynamoDBClient
  tableName: string
  tenantId: string
  sourceId: string
  owner: string
  ttlSeconds?: number
}) => {
  const nowEpoch = Math.floor(Date.now() / 1000)
  const expiresAt = nowEpoch + Math.max(30, ttlSeconds)

  try {
    await ddb.send(
      new UpdateItemCommand({
        TableName: tableName,
        Key: {
          tenantId: { S: tenantId },
        },
        UpdateExpression: "SET syncSourceLocks.#sid = :lock",
        ConditionExpression:
          "attribute_not_exists(syncSourceLocks.#sid.expiresAt) OR syncSourceLocks.#sid.expiresAt < :now OR syncSourceLocks.#sid.owner = :owner",
        ExpressionAttributeNames: {
          "#sid": sourceId,
        },
        ExpressionAttributeValues: {
          ":lock": {
            M: {
              owner: { S: owner },
              acquiredAt: { N: String(nowEpoch) },
              expiresAt: { N: String(expiresAt) },
            },
          },
          ":now": { N: String(nowEpoch) },
          ":owner": { S: owner },
        },
      })
    )
    return true
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) return false
    throw error
  }
}

export const releaseSourceSyncLock = async ({
  ddb,
  tableName,
  tenantId,
  sourceId,
  owner,
}: {
  ddb: DynamoDBClient
  tableName: string
  tenantId: string
  sourceId: string
  owner: string
}) => {
  try {
    await ddb.send(
      new UpdateItemCommand({
        TableName: tableName,
        Key: {
          tenantId: { S: tenantId },
        },
        UpdateExpression: "REMOVE syncSourceLocks.#sid",
        ConditionExpression: "syncSourceLocks.#sid.owner = :owner",
        ExpressionAttributeNames: {
          "#sid": sourceId,
        },
        ExpressionAttributeValues: {
          ":owner": { S: owner },
        },
      })
    )
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) return
    throw error
  }
}
