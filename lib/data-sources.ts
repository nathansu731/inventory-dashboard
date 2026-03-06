import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb"
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb"

export type DataSourceProvider = "shopify" | "amazon" | "quickbooks" | "bigcommerce" | "other"
export type DataSourceState = "not_connected" | "connected" | "error"
export type SyncMode = "manual" | "every-6h" | "daily" | "weekly"

export type DataSourceRun = {
  id: string
  status: "success" | "error"
  message: string
  startedAt: string
  finishedAt: string
}

export type DataSourceAuditEvent = {
  id: string
  type: string
  actor: string
  actorType: "user" | "system"
  sourceId?: string
  provider?: DataSourceProvider
  message: string
  createdAt: string
}

export type DataSourceRecord = {
  id: string
  provider: DataSourceProvider
  accountName: string
  accountId?: string
  state: DataSourceState
  connectedAt: string | null
  selectedTables: string[]
  syncMode: SyncMode
  syncStartDate: string
  lastImportAt: string | null
  nextImportAt: string | null
  retryCount: number
  lastError: string | null
  runs: DataSourceRun[]
  createdAt: string
  updatedAt: string
}

export type TenantRecord = Record<string, unknown> & {
  tenantId: string
  dataSources?: Record<string, unknown>
  dataSourceAdapters?: Record<string, unknown>
  dataSourceAudit?: unknown[]
}

export const resolveAwsRegion = () =>
  process.env.AWS_REGION || process.env.COGNITO_REGION || ""

export const getTenantsTableName = () => process.env.TENANTS_TABLE || ""

const normalizeProvider = (value: unknown): DataSourceProvider => {
  const raw = typeof value === "string" ? value.toLowerCase() : ""
  if (raw === "shopify" || raw === "amazon" || raw === "quickbooks" || raw === "bigcommerce" || raw === "other") {
    return raw
  }
  return "other"
}

const normalizeState = (value: unknown): DataSourceState => {
  const raw = typeof value === "string" ? value.toLowerCase() : ""
  if (raw === "connected" || raw === "error" || raw === "not_connected") return raw
  return "not_connected"
}

const normalizeSyncMode = (value: unknown): SyncMode => {
  const raw = typeof value === "string" ? value.toLowerCase() : ""
  if (raw === "every-6h" || raw === "daily" || raw === "weekly" || raw === "manual") return raw
  return "manual"
}

const sanitizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "")

const sanitizeRuns = (value: unknown): DataSourceRun[] => {
  const input = Array.isArray(value) ? value : []
  return input
    .map((run) => {
      const item = typeof run === "object" && run ? (run as Record<string, unknown>) : null
      if (!item) return null
      const id = sanitizeText(item.id)
      const status = item.status === "error" ? "error" : item.status === "success" ? "success" : null
      const startedAt = sanitizeText(item.startedAt)
      const finishedAt = sanitizeText(item.finishedAt)
      if (!id || !status || !startedAt || !finishedAt) return null
      return {
        id,
        status,
        message: sanitizeText(item.message),
        startedAt,
        finishedAt,
      } satisfies DataSourceRun
    })
    .filter((run): run is DataSourceRun => Boolean(run))
    .slice(0, 20)
}

const normalizeSource = (id: string, value: unknown): DataSourceRecord | null => {
  const input = typeof value === "object" && value ? (value as Record<string, unknown>) : null
  if (!input) return null
  const provider = normalizeProvider(input.provider)
  const now = new Date().toISOString()
  return {
    id,
    provider,
    accountName: sanitizeText(input.accountName),
    accountId: sanitizeText(input.accountId) || undefined,
    state: normalizeState(input.state),
    connectedAt: sanitizeText(input.connectedAt) || null,
    selectedTables: Array.isArray(input.selectedTables)
      ? input.selectedTables.map((item) => sanitizeText(item)).filter(Boolean)
      : [],
    syncMode: normalizeSyncMode(input.syncMode),
    syncStartDate: sanitizeText(input.syncStartDate),
    lastImportAt: sanitizeText(input.lastImportAt) || null,
    nextImportAt: sanitizeText(input.nextImportAt) || null,
    retryCount: Math.max(0, Number(input.retryCount ?? 0) || 0),
    lastError: sanitizeText(input.lastError) || null,
    runs: sanitizeRuns(input.runs),
    createdAt: sanitizeText(input.createdAt) || now,
    updatedAt: sanitizeText(input.updatedAt) || now,
  }
}

export const normalizeSourcesMap = (value: unknown): Record<string, DataSourceRecord> => {
  const input = typeof value === "object" && value ? (value as Record<string, unknown>) : {}
  const map: Record<string, DataSourceRecord> = {}
  for (const [id, raw] of Object.entries(input)) {
    const parsed = normalizeSource(id, raw)
    if (parsed) map[id] = parsed
  }
  return map
}

export const normalizeAuditEvents = (value: unknown): DataSourceAuditEvent[] => {
  const input = Array.isArray(value) ? value : []
  const events: DataSourceAuditEvent[] = []

  for (const raw of input) {
    const item = typeof raw === "object" && raw ? (raw as Record<string, unknown>) : null
    if (!item) continue

    const id = sanitizeText(item.id)
    const type = sanitizeText(item.type)
    const actor = sanitizeText(item.actor)
    const actorType = item.actorType === "system" ? "system" : "user"
    const message = sanitizeText(item.message)
    const createdAt = sanitizeText(item.createdAt)
    if (!id || !type || !actor || !message || !createdAt) continue

    events.push({
      id,
      type,
      actor,
      actorType,
      sourceId: sanitizeText(item.sourceId) || undefined,
      provider: normalizeProvider(item.provider),
      message,
      createdAt,
    })
  }

  return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export const readTenantRecord = async (
  ddb: DynamoDBClient,
  tableName: string,
  tenantId: string
): Promise<TenantRecord | null> => {
  const result = await ddb.send(
    new GetItemCommand({
      TableName: tableName,
      Key: marshall({ tenantId }),
      ConsistentRead: true,
    })
  )
  if (!result.Item) return null
  return unmarshall(result.Item) as TenantRecord
}

export const writeTenantRecord = async (ddb: DynamoDBClient, tableName: string, record: TenantRecord) => {
  await ddb.send(
    new PutItemCommand({
      TableName: tableName,
      Item: marshall(record, { removeUndefinedValues: true }),
    })
  )
}

export const computeNextImportAt = (syncMode: SyncMode, nowIso: string) => {
  if (syncMode === "manual") return null
  const next = new Date(nowIso)
  if (syncMode === "every-6h") next.setHours(next.getHours() + 6)
  else if (syncMode === "daily") next.setDate(next.getDate() + 1)
  else next.setDate(next.getDate() + 7)
  return next.toISOString()
}

export const computeRetryImportAt = (nowIso: string, retryCount: number) => {
  const next = new Date(nowIso)
  const minutes = retryCount <= 1 ? 15 : retryCount === 2 ? 30 : 60
  next.setMinutes(next.getMinutes() + minutes)
  return next.toISOString()
}
