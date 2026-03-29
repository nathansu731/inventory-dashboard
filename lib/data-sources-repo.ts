import {
  DeleteItemCommand,
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb"
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb"
import { normalizeSourcesMap, type DataSourceRecord } from "@/lib/data-sources"

const dataSourcesTableName = () => process.env.DATA_SOURCES_TABLE || ""

const parseSourceItem = (item: Record<string, unknown>): DataSourceRecord | null => {
  if (typeof item.sourceId !== "string") return null
  const sourceId = item.sourceId
  const map = normalizeSourcesMap({ [sourceId]: item })
  return map[sourceId] || null
}

export const hasDedicatedDataSourcesTable = () => Boolean(dataSourcesTableName())

export type DueSourceItem = {
  tenantId: string
  sourceId: string
}

export const loadSourcesFromDedicatedTable = async (
  ddb: DynamoDBClient,
  tenantId: string
): Promise<Record<string, DataSourceRecord>> => {
  const tableName = dataSourcesTableName()
  if (!tableName) return {}

  const rows: Record<string, DataSourceRecord> = {}
  let lastEvaluatedKey: Record<string, AttributeValue> | undefined

  do {
    const result = await ddb.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "tenantId = :tenantId",
        ExpressionAttributeValues: {
          ":tenantId": { S: tenantId },
        },
        ExclusiveStartKey: lastEvaluatedKey,
      })
    )

    for (const rawItem of result.Items ?? []) {
      const item = unmarshall(rawItem) as Record<string, unknown>
      const parsed = parseSourceItem(item)
      if (parsed) rows[parsed.id] = parsed
    }

    lastEvaluatedKey = result.LastEvaluatedKey as Record<string, AttributeValue> | undefined
  } while (lastEvaluatedKey)

  return rows
}

export const readSourcesWithFallback = async (
  ddb: DynamoDBClient,
  tenantId: string,
  fallbackRaw: unknown
) => {
  const dedicated = await loadSourcesFromDedicatedTable(ddb, tenantId)
  if (Object.keys(dedicated).length > 0) return dedicated
  return normalizeSourcesMap(fallbackRaw)
}

export const upsertSourceInDedicatedTable = async (
  ddb: DynamoDBClient,
  tenantId: string,
  source: DataSourceRecord
) => {
  const tableName = dataSourcesTableName()
  if (!tableName) return

  const dueIndexPk =
    source.state === "connected" && source.syncMode !== "manual" && source.nextImportAt
      ? "DUE#CONNECTED"
      : undefined
  const dueIndexSk =
    source.state === "connected" && source.syncMode !== "manual" && source.nextImportAt
      ? `${source.nextImportAt}#${tenantId}#${source.id}`
      : undefined

  await ddb.send(
    new PutItemCommand({
      TableName: tableName,
      Item: marshall(
        {
          tenantId,
          sourceId: source.id,
          GSI1PK: dueIndexPk,
          GSI1SK: dueIndexSk,
          GSI2PK: `PROVIDER#${source.provider}`,
          GSI2SK: `${tenantId}#${source.id}`,
          provider: source.provider,
          accountName: source.accountName,
          accountId: source.accountId,
          state: source.state,
          connectedAt: source.connectedAt,
          availableTables: source.availableTables,
          selectedTables: source.selectedTables,
          syncMode: source.syncMode,
          syncStartDate: source.syncStartDate,
          lastImportAt: source.lastImportAt,
          nextImportAt: source.nextImportAt,
          retryCount: source.retryCount,
          lastError: source.lastError,
          runs: source.runs,
          createdAt: source.createdAt,
          updatedAt: source.updatedAt,
        },
        { removeUndefinedValues: true }
      ),
    })
  )
}

export const deleteSourceFromDedicatedTable = async (
  ddb: DynamoDBClient,
  tenantId: string,
  sourceId: string
) => {
  const tableName = dataSourcesTableName()
  if (!tableName) return

  await ddb.send(
    new DeleteItemCommand({
      TableName: tableName,
      Key: marshall({ tenantId, sourceId }),
    })
  )
}

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

export const listDueSourcesPage = async ({
  ddb,
  dueAtIso,
  limit,
  nextToken,
}: {
  ddb: DynamoDBClient
  dueAtIso: string
  limit: number
  nextToken?: string | null
}): Promise<{ items: DueSourceItem[]; nextToken: string | null }> => {
  const tableName = dataSourcesTableName()
  if (!tableName) return { items: [], nextToken: null }

  const result = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "byDueAt",
      KeyConditionExpression: "GSI1PK = :pk AND GSI1SK <= :dueAt",
      ExpressionAttributeValues: {
        ":pk": { S: "DUE#CONNECTED" },
        ":dueAt": { S: `${dueAtIso}#` },
      },
      Limit: Math.max(1, Math.min(100, limit)),
      ExclusiveStartKey: decodeNextToken(nextToken),
      ProjectionExpression: "tenantId, sourceId",
    })
  )

  const items: DueSourceItem[] = (result.Items ?? [])
    .map((raw) => ({
      tenantId: raw.tenantId?.S || "",
      sourceId: raw.sourceId?.S || "",
    }))
    .filter((item) => item.tenantId && item.sourceId)

  return {
    items,
    nextToken: encodeNextToken(result.LastEvaluatedKey as Record<string, AttributeValue> | undefined),
  }
}
