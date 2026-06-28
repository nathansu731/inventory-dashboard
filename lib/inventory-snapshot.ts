import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb"
import { unmarshall } from "@aws-sdk/util-dynamodb"
import { getTenantsTableName, resolveAwsRegion, type TenantRecord } from "@/lib/tenant-users"

export type InventorySnapshotRow = {
  sku: string
  store: string
  onHand: number
  asOfDate?: string | null
}

export type InventorySnapshotSourceType = "sales_csv" | "inventory_csv" | "manual" | "source_import"

export type InventorySnapshotMetadata = {
  s3Key: string
  uploadedAt: string
  rowCount: number
  asOfDate: string | null
  sourceType: InventorySnapshotSourceType
}

type InventorySnapshotDocument = {
  version: 1
  tenantId: string
  uploadedAt: string
  asOfDate: string | null
  rowCount: number
  sourceType: InventorySnapshotSourceType
  rows: InventorySnapshotRow[]
}

const s3 = new S3Client({})
const ddb = new DynamoDBClient({ region: resolveAwsRegion() || undefined })

const rawBucket = () => process.env.S3_RAW_BUCKET || ""

const streamToString = async (stream: unknown) => {
  if (!stream || typeof (stream as { transformToString?: unknown }).transformToString !== "function") {
    return ""
  }
  return (stream as { transformToString: () => Promise<string> }).transformToString()
}

const sanitizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "")

const sanitizeDate = (value: unknown) => {
  const normalized = sanitizeText(value)
  return normalized || null
}

const toFiniteNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const buildInventorySeriesKey = (sku: string, store: string) => `${sku}::${store || "Unknown"}`

export const normalizeInventorySnapshotRow = (row: unknown): InventorySnapshotRow | null => {
  const input = typeof row === "object" && row ? (row as Record<string, unknown>) : null
  if (!input) return null

  const sku = sanitizeText(input.sku)
  const store = sanitizeText(input.store) || "Unknown"
  const onHand = toFiniteNumber(input.onHand)
  if (!sku || onHand === null || onHand < 0) return null

  return {
    sku,
    store,
    onHand,
    asOfDate: sanitizeDate(input.asOfDate),
  }
}

export const normalizeInventorySnapshotRows = (rows: unknown): InventorySnapshotRow[] => {
  if (!Array.isArray(rows)) return []
  return rows.map(normalizeInventorySnapshotRow).filter((row): row is InventorySnapshotRow => Boolean(row))
}

export const readInventorySnapshotMetadata = (tenantRecord: TenantRecord | null | undefined): InventorySnapshotMetadata | null => {
  if (!tenantRecord) return null
  const s3Key = sanitizeText(tenantRecord.inventorySnapshotKey)
  if (!s3Key) return null

  const uploadedAt = sanitizeText(tenantRecord.inventorySnapshotUploadedAt)
  const rowCount = Math.max(0, Math.floor(toFiniteNumber(tenantRecord.inventorySnapshotRowCount) ?? 0))
  const asOfDate = sanitizeDate(tenantRecord.inventorySnapshotAsOfDate)
  const rawSource = sanitizeText(tenantRecord.inventorySnapshotSourceType)
  const sourceType: InventorySnapshotSourceType =
    rawSource === "sales_csv" || rawSource === "manual" || rawSource === "source_import" ? rawSource : "inventory_csv"

  return {
    s3Key,
    uploadedAt,
    rowCount,
    asOfDate,
    sourceType,
  }
}

export const loadInventorySnapshot = async (tenantId: string): Promise<{ metadata: InventorySnapshotMetadata | null; rows: InventorySnapshotRow[] }> => {
  const tableName = getTenantsTableName()
  const bucket = rawBucket()
  if (!tenantId || !tableName || !bucket) {
    return { metadata: null, rows: [] }
  }

  const tenantResult = await ddb.send(
    new GetItemCommand({
      TableName: tableName,
      Key: { tenantId: { S: tenantId } },
      ConsistentRead: true,
    })
  )

  const tenantRecord = tenantResult.Item ? (unmarshall(tenantResult.Item) as TenantRecord) : null
  const metadata = readInventorySnapshotMetadata(tenantRecord)
  if (!metadata?.s3Key) {
    return { metadata: null, rows: [] }
  }

  try {
    const object = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: metadata.s3Key,
      })
    )
    const raw = await streamToString(object.Body)
    const parsed = JSON.parse(raw) as InventorySnapshotDocument
    return {
      metadata,
      rows: normalizeInventorySnapshotRows(parsed.rows),
    }
  } catch {
    return { metadata, rows: [] }
  }
}

export const saveInventorySnapshot = async ({
  tenantId,
  rows,
  sourceType,
  asOfDate,
}: {
  tenantId: string
  rows: InventorySnapshotRow[]
  sourceType: InventorySnapshotSourceType
  asOfDate?: string | null
}) => {
  const tableName = getTenantsTableName()
  const bucket = rawBucket()
  if (!tenantId || !tableName || !bucket) {
    throw new Error("inventory_snapshot_storage_not_configured")
  }

  const normalizedRows = normalizeInventorySnapshotRows(rows)
  const uploadedAt = new Date().toISOString()
  const sanitizedAsOfDate = sanitizeDate(asOfDate)
  const snapshotId = uploadedAt.replace(/[:.]/g, "-")
  const s3Key = `tenant-raw/${tenantId}/inventory/${snapshotId}.json`
  const document: InventorySnapshotDocument = {
    version: 1,
    tenantId,
    uploadedAt,
    asOfDate: sanitizedAsOfDate,
    rowCount: normalizedRows.length,
    sourceType,
    rows: normalizedRows,
  }

  const existing = await loadInventorySnapshot(tenantId)
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      ContentType: "application/json",
      Body: JSON.stringify(document),
    })
  )

  await ddb.send(
    new UpdateItemCommand({
      TableName: tableName,
      Key: { tenantId: { S: tenantId } },
      UpdateExpression:
        "SET inventorySnapshotKey = :key, inventorySnapshotUploadedAt = :uploadedAt, inventorySnapshotRowCount = :rowCount, inventorySnapshotAsOfDate = :asOfDate, inventorySnapshotSourceType = :sourceType, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":key": { S: s3Key },
        ":uploadedAt": { S: uploadedAt },
        ":rowCount": { N: String(normalizedRows.length) },
        ":asOfDate": sanitizedAsOfDate ? { S: sanitizedAsOfDate } : { NULL: true },
        ":sourceType": { S: sourceType },
        ":updatedAt": { S: uploadedAt },
      },
    })
  )

  if (existing.metadata?.s3Key && existing.metadata.s3Key !== s3Key) {
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: existing.metadata.s3Key,
        })
      )
    } catch {
      // Ignore cleanup failures; the latest pointer is already updated.
    }
  }

  return {
    metadata: {
      s3Key,
      uploadedAt,
      rowCount: normalizedRows.length,
      asOfDate: sanitizedAsOfDate,
      sourceType,
    } satisfies InventorySnapshotMetadata,
    rows: normalizedRows,
  }
}

export const clearInventorySnapshot = async (tenantId: string) => {
  const tableName = getTenantsTableName()
  const bucket = rawBucket()
  if (!tenantId || !tableName || !bucket) {
    throw new Error("inventory_snapshot_storage_not_configured")
  }

  const existing = await loadInventorySnapshot(tenantId)

  await ddb.send(
    new UpdateItemCommand({
      TableName: tableName,
      Key: { tenantId: { S: tenantId } },
      UpdateExpression:
        "REMOVE inventorySnapshotKey, inventorySnapshotUploadedAt, inventorySnapshotRowCount, inventorySnapshotAsOfDate, inventorySnapshotSourceType SET updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":updatedAt": { S: new Date().toISOString() },
      },
    })
  )

  if (existing.metadata?.s3Key) {
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: existing.metadata.s3Key,
        })
      )
    } catch {
      // Ignore cleanup failures after metadata removal.
    }
  }
}
