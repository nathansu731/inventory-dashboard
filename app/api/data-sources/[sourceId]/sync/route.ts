import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { NextResponse } from "next/server"
import { getTokenUserContext, normalizeUsersMap, roleForUser } from "@/lib/tenant-users"
import { getTenantsTableName, readTenantRecord, resolveAwsRegion, writeTenantRecord } from "@/lib/data-sources"
import { runSourceSync } from "@/lib/data-source-sync"
import { emitConnectorNotification } from "@/lib/connector-notifications"
import { acquireSourceSyncLock, makeWorkerOwnerId, releaseSourceSyncLock } from "@/lib/data-source-worker"
import { appendDataSourceAudit } from "@/lib/data-source-audit"
import { readSourcesWithFallback, upsertSourceInDedicatedTable } from "@/lib/data-sources-repo"

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

export async function POST(_request: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  const ctx = await readContext()
  if (ctx.error || !ctx.tokenCtx) return withCookies(ctx.error!, ctx.cookiesToSet)

  const tableName = getTenantsTableName()
  const region = resolveAwsRegion()
  if (!tableName || !region) {
    return withCookies(NextResponse.json({ error: "missing_tenants_config" }, { status: 500 }), ctx.cookiesToSet)
  }

  const { sourceId } = await params
  if (!sourceId) return withCookies(NextResponse.json({ error: "missing_source_id" }, { status: 400 }), ctx.cookiesToSet)

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
  if (existing.state !== "connected") {
    return withCookies(NextResponse.json({ error: "source_not_connected" }, { status: 409 }), ctx.cookiesToSet)
  }
  if (existing.selectedTables.length === 0) {
    return withCookies(NextResponse.json({ error: "no_tables_selected" }, { status: 400 }), ctx.cookiesToSet)
  }

  const owner = makeWorkerOwnerId()
  const locked = await acquireSourceSyncLock({
    ddb,
    tableName,
    tenantId: ctx.tokenCtx.tenantId,
    sourceId,
    owner,
    ttlSeconds: 180,
  })
  if (!locked) {
    return withCookies(NextResponse.json({ error: "source_sync_in_progress" }, { status: 409 }), ctx.cookiesToSet)
  }

  try {
    const result = await runSourceSync(tenantRecord, sourceId, existing)
    sources[sourceId] = result.source
    tenantRecord.dataSources = sources
    appendDataSourceAudit({
      tenantRecord,
      type: result.ok ? "source_sync_manual_success" : "source_sync_manual_failed",
      actor: ctx.tokenCtx.email || ctx.tokenCtx.sub,
      actorType: "user",
      sourceId,
      provider: result.source.provider,
      message: result.run.message,
    })
    tenantRecord.updatedAt = result.source.updatedAt
    await writeTenantRecord(ddb, tableName, tenantRecord)
    await upsertSourceInDedicatedTable(ddb, ctx.tokenCtx.tenantId, result.source)
    try {
      await emitConnectorNotification({
        tenantId: ctx.tokenCtx.tenantId,
        source: result.source,
        run: result.run,
      })
    } catch {
      // best effort; do not fail sync response if notification write fails
    }

    if (!result.ok) {
      return withCookies(
        NextResponse.json({ error: result.errorCode || "sync_failed", source: result.source, run: result.run }, { status: 409 }),
        ctx.cookiesToSet
      )
    }

    return withCookies(NextResponse.json({ source: result.source, run: result.run }), ctx.cookiesToSet)
  } finally {
    await releaseSourceSyncLock({
      ddb,
      tableName,
      tenantId: ctx.tokenCtx.tenantId,
      sourceId,
      owner,
    })
  }
}
