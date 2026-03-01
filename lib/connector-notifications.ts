import crypto from "crypto"
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb"
import { marshall } from "@aws-sdk/util-dynamodb"
import type { DataSourceRecord } from "@/lib/data-sources"

const resolveRegion = () =>
  process.env.AWS_REGION || process.env.COGNITO_REGION || process.env.NEXT_PUBLIC_COGNITO_REGION || ""

export const emitConnectorNotification = async ({
  tenantId,
  source,
  run,
}: {
  tenantId: string
  source: DataSourceRecord
  run: { status: "success" | "error"; message: string; startedAt: string; finishedAt: string }
}) => {
  const tableName = process.env.NOTIFICATIONS_TABLE || ""
  const region = resolveRegion()
  if (!tableName || !region || !tenantId) return

  const runId = `connector-${source.provider}-${crypto.randomUUID()}`
  const status = run.status === "success" ? "DONE" : "FAILED"
  const createdAt = run.finishedAt || new Date().toISOString()

  const summary = {
    sourceType: "connector",
    provider: source.provider,
    sourceId: source.id,
    syncMode: source.syncMode,
    selectedTables: source.selectedTables,
    message: run.message,
    status: run.status,
  }

  const ddb = new DynamoDBClient({ region })
  await ddb.send(
    new PutItemCommand({
      TableName: tableName,
      Item: marshall(
        {
          PK: `TENANT#${tenantId}`,
          SK: `RUN#${runId}`,
          GSI1PK: `TENANT#${tenantId}`,
          GSI1SK: createdAt,
          notificationId: runId,
          runId,
          tenantId,
          status,
          createdAt,
          updatedAt: createdAt,
          read: false,
          summary: JSON.stringify(summary),
        },
        { removeUndefinedValues: true }
      ),
    })
  )
}
