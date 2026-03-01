import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { NextResponse } from "next/server"
import { getTokenUserContext, normalizeUsersMap, roleForUser } from "@/lib/tenant-users"
import {
  getTenantsTableName,
  readTenantRecord,
  resolveAwsRegion,
  writeTenantRecord,
  type DataSourceState,
  type SyncMode,
} from "@/lib/data-sources"
import { appendDataSourceAudit } from "@/lib/data-source-audit"
import { normalizeAdapterConfig } from "@/lib/data-source-adapters"
import {
  deleteSourceFromDedicatedTable,
  readSourcesWithFallback,
  upsertSourceInDedicatedTable,
} from "@/lib/data-sources-repo"

type CookieToSet = { name: string; value: string; options: Record<string, unknown> }

const withCookies = (response: NextResponse, cookiesToSet: CookieToSet[]) => {
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  return response
}

const readContext = async () => {
  const { getValidIdToken } = await import("@/lib/server-auth")
  const { idToken, cookiesToSet } = await getValidIdToken()
  if (!idToken) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }), cookiesToSet, tokenCtx: null }
  }
  const tokenCtx = getTokenUserContext(idToken)
  if (!tokenCtx) {
    return { error: NextResponse.json({ error: "missing_tenant" }, { status: 403 }), cookiesToSet, tokenCtx: null }
  }
  return { error: null, cookiesToSet, tokenCtx }
}

const normalizeSyncMode = (value: unknown): SyncMode => {
  const raw = typeof value === "string" ? value.toLowerCase() : ""
  if (raw === "every-6h" || raw === "daily" || raw === "weekly" || raw === "manual") return raw
  return "manual"
}

const normalizeState = (value: unknown): DataSourceState => {
  const raw = typeof value === "string" ? value.toLowerCase() : ""
  if (raw === "connected" || raw === "error" || raw === "not_connected") return raw
  return "not_connected"
}

export async function PATCH(request: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  const ctx = await readContext()
  if (ctx.error || !ctx.tokenCtx) return withCookies(ctx.error!, ctx.cookiesToSet)

  const tableName = getTenantsTableName()
  const region = resolveAwsRegion()
  if (!tableName || !region) {
    return withCookies(NextResponse.json({ error: "missing_tenants_config" }, { status: 500 }), ctx.cookiesToSet)
  }

  const { sourceId } = await params
  if (!sourceId) return withCookies(NextResponse.json({ error: "missing_source_id" }, { status: 400 }), ctx.cookiesToSet)

  const payload = (await request.json().catch(() => null)) as
    | { selectedTables?: unknown; syncMode?: unknown; syncStartDate?: unknown; state?: unknown; adapter?: unknown }
    | null

  const ddb = new DynamoDBClient({ region })
  const tenantRecord = await readTenantRecord(ddb, tableName, ctx.tokenCtx.tenantId)
  if (!tenantRecord) return withCookies(NextResponse.json({ error: "tenant_not_found" }, { status: 404 }), ctx.cookiesToSet)

  const users = normalizeUsersMap(tenantRecord.users)
  const currentRole = roleForUser(users, ctx.tokenCtx.sub)
  if (currentRole !== "admin") {
    return withCookies(NextResponse.json({ error: "forbidden" }, { status: 403 }), ctx.cookiesToSet)
  }

  const sources = await readSourcesWithFallback(ddb, ctx.tokenCtx.tenantId, tenantRecord.dataSources)
  const existing = sources[sourceId]
  if (!existing) return withCookies(NextResponse.json({ error: "not_found" }, { status: 404 }), ctx.cookiesToSet)

  const now = new Date().toISOString()
  const selectedTables = Array.isArray(payload?.selectedTables)
    ? payload?.selectedTables.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : existing.selectedTables

  const state = payload?.state !== undefined ? normalizeState(payload.state) : existing.state
  const next = {
    ...existing,
    selectedTables,
    syncMode: payload?.syncMode !== undefined ? normalizeSyncMode(payload.syncMode) : existing.syncMode,
    syncStartDate: typeof payload?.syncStartDate === "string" ? payload.syncStartDate : existing.syncStartDate,
    state,
    accountName: state === "not_connected" ? "" : existing.accountName,
    accountId: state === "not_connected" ? undefined : existing.accountId,
    connectedAt: state === "not_connected" ? null : existing.connectedAt,
    updatedAt: now,
  }

  sources[sourceId] = next
  tenantRecord.dataSources = sources
  if (payload?.adapter !== undefined) {
    const adapterMap =
      typeof tenantRecord.dataSourceAdapters === "object" && tenantRecord.dataSourceAdapters
        ? ({ ...(tenantRecord.dataSourceAdapters as Record<string, unknown>) } as Record<string, unknown>)
        : {}
    const parsedAdapter = normalizeAdapterConfig(payload.adapter)
    if (parsedAdapter) {
      adapterMap[sourceId] = { ...parsedAdapter, updatedAt: now }
    } else {
      delete adapterMap[sourceId]
    }
    tenantRecord.dataSourceAdapters = adapterMap
  }
  if (state === "not_connected") {
    const secretMap =
      typeof tenantRecord.dataSourceSecrets === "object" && tenantRecord.dataSourceSecrets
        ? ({ ...(tenantRecord.dataSourceSecrets as Record<string, unknown>) } as Record<string, unknown>)
        : {}
    delete secretMap[sourceId]
    tenantRecord.dataSourceSecrets = secretMap
    const adapterMap =
      typeof tenantRecord.dataSourceAdapters === "object" && tenantRecord.dataSourceAdapters
        ? ({ ...(tenantRecord.dataSourceAdapters as Record<string, unknown>) } as Record<string, unknown>)
        : {}
    delete adapterMap[sourceId]
    tenantRecord.dataSourceAdapters = adapterMap
  }
  appendDataSourceAudit({
    tenantRecord,
    type: state === "not_connected" ? "source_disconnected" : "source_config_updated",
    actor: ctx.tokenCtx.email || ctx.tokenCtx.sub,
    actorType: "user",
    sourceId,
    provider: existing.provider,
    message:
      state === "not_connected"
        ? `${existing.provider} source disconnected`
        : `${existing.provider} source configuration updated`,
  })
  tenantRecord.updatedAt = now
  await writeTenantRecord(ddb, tableName, tenantRecord)
  if (state === "not_connected") {
    await deleteSourceFromDedicatedTable(ddb, ctx.tokenCtx.tenantId, sourceId)
  } else {
    await upsertSourceInDedicatedTable(ddb, ctx.tokenCtx.tenantId, next)
  }

  return withCookies(NextResponse.json(next), ctx.cookiesToSet)
}
