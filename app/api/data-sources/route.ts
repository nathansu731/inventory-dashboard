import crypto from "crypto"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { NextResponse } from "next/server"
import { getTokenUserContext, normalizeUsersMap, roleForUser } from "@/lib/tenant-users"
import {
  getTenantsTableName,
  normalizeAuditEvents,
  readTenantRecord,
  resolveAwsRegion,
  writeTenantRecord,
  type DataSourceProvider,
  type DataSourceRecord,
} from "@/lib/data-sources"
import { appendDataSourceAudit } from "@/lib/data-source-audit"
import { readSourcesWithFallback, upsertSourceInDedicatedTable } from "@/lib/data-sources-repo"
import { normalizeAdapterMap } from "@/lib/data-source-adapters"
import { sanitizeAvailableObjects, sanitizeSelectedObjects } from "@/lib/data-source-catalog"

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
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }), cookiesToSet, tokenCtx: null, idToken }
  }
  const tokenCtx = getTokenUserContext(idToken)
  if (!tokenCtx) {
    return { error: NextResponse.json({ error: "missing_tenant" }, { status: 403 }), cookiesToSet, tokenCtx: null, idToken }
  }
  return { error: null, cookiesToSet, tokenCtx, idToken }
}

const providerFromPayload = (value: unknown): DataSourceProvider => {
  const raw = typeof value === "string" ? value.toLowerCase() : ""
  if (raw === "shopify" || raw === "amazon" || raw === "quickbooks" || raw === "bigcommerce" || raw === "other") {
    return raw
  }
  return "other"
}

export async function GET() {
  const ctx = await readContext()
  if (ctx.error || !ctx.tokenCtx) return withCookies(ctx.error!, ctx.cookiesToSet)

  const tableName = getTenantsTableName()
  const region = resolveAwsRegion()
  if (!tableName || !region) {
    return withCookies(NextResponse.json({ error: "missing_tenants_config" }, { status: 500 }), ctx.cookiesToSet)
  }

  const ddb = new DynamoDBClient({ region })
  const tenantRecord = await readTenantRecord(ddb, tableName, ctx.tokenCtx.tenantId)
  if (!tenantRecord) {
    return withCookies(NextResponse.json({ error: "tenant_not_found" }, { status: 404 }), ctx.cookiesToSet)
  }

  const users = normalizeUsersMap(tenantRecord.users)
  const currentRole = roleForUser(users, ctx.tokenCtx.sub)
  const sourceMap = await readSourcesWithFallback(ddb, ctx.tokenCtx.tenantId, tenantRecord.dataSources)
  const items = Object.values(sourceMap).sort((a, b) =>
    a.provider.localeCompare(b.provider)
  )
  const auditItems = normalizeAuditEvents(tenantRecord.dataSourceAudit).slice(0, 30)
  const adapters = normalizeAdapterMap(tenantRecord.dataSourceAdapters)

  return withCookies(
    NextResponse.json({
      currentUserRole: currentRole,
      canManageSources: currentRole === "admin",
      items,
      audit: auditItems,
      adapters,
    }),
    ctx.cookiesToSet
  )
}

export async function POST(request: Request) {
  const ctx = await readContext()
  if (ctx.error || !ctx.tokenCtx) return withCookies(ctx.error!, ctx.cookiesToSet)

  const tableName = getTenantsTableName()
  const region = resolveAwsRegion()
  if (!tableName || !region) {
    return withCookies(NextResponse.json({ error: "missing_tenants_config" }, { status: 500 }), ctx.cookiesToSet)
  }

  const payload = (await request.json().catch(() => null)) as
    | { provider?: string; accountName?: string; accountId?: string; selectedTables?: unknown; availableTables?: unknown }
    | null

  const provider = providerFromPayload(payload?.provider)
  const accountName = typeof payload?.accountName === "string" ? payload.accountName.trim() : ""
  const accountId = typeof payload?.accountId === "string" ? payload.accountId.trim() : ""
  if (!accountName) {
    return withCookies(NextResponse.json({ error: "missing_account_name" }, { status: 400 }), ctx.cookiesToSet)
  }

  const ddb = new DynamoDBClient({ region })
  const tenantRecord = await readTenantRecord(ddb, tableName, ctx.tokenCtx.tenantId)
  if (!tenantRecord) {
    return withCookies(NextResponse.json({ error: "tenant_not_found" }, { status: 404 }), ctx.cookiesToSet)
  }

  const users = normalizeUsersMap(tenantRecord.users)
  const currentRole = roleForUser(users, ctx.tokenCtx.sub)
  if (currentRole !== "admin") {
    return withCookies(NextResponse.json({ error: "forbidden" }, { status: 403 }), ctx.cookiesToSet)
  }

  const sources = await readSourcesWithFallback(ddb, ctx.tokenCtx.tenantId, tenantRecord.dataSources)
  const now = new Date().toISOString()
  const existing = Object.values(sources).find((source) => source.provider === provider)
  const sourceId = existing?.id || crypto.randomUUID()

  const nextSource: DataSourceRecord = {
    id: sourceId,
    provider,
    accountName,
    accountId: accountId || existing?.accountId,
    state: "connected",
    connectedAt: now,
    availableTables: sanitizeAvailableObjects(provider, payload?.availableTables ?? existing?.availableTables),
    selectedTables: sanitizeSelectedObjects(provider, payload?.selectedTables ?? existing?.selectedTables),
    syncMode: existing?.syncMode || "manual",
    syncStartDate: existing?.syncStartDate || "",
    lastImportAt: existing?.lastImportAt || null,
    nextImportAt: existing?.nextImportAt || null,
    retryCount: existing?.retryCount || 0,
    lastError: existing?.lastError || null,
    runs: existing?.runs || [],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }

  sources[sourceId] = nextSource
  tenantRecord.dataSources = sources
  appendDataSourceAudit({
    tenantRecord,
    type: existing ? "source_reconnected" : "source_connected",
    actor: ctx.tokenCtx.email || ctx.tokenCtx.sub,
    actorType: "user",
    sourceId,
    provider,
    message: `${provider} source ${existing ? "reconnected" : "connected"}: ${accountName}`,
  })
  tenantRecord.updatedAt = now
  await writeTenantRecord(ddb, tableName, tenantRecord)
  await upsertSourceInDedicatedTable(ddb, ctx.tokenCtx.tenantId, nextSource)

  return withCookies(NextResponse.json(nextSource, { status: 201 }), ctx.cookiesToSet)
}
