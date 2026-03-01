import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { NextResponse } from "next/server"
import { getTokenUserContext, normalizeUsersMap, roleForUser } from "@/lib/tenant-users"
import { getTenantsTableName, readTenantRecord, resolveAwsRegion } from "@/lib/data-sources"
import { readSourcesWithFallback } from "@/lib/data-sources-repo"

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

const ageHours = (value: string | null | undefined) => {
  if (!value) return null
  const ts = new Date(value).getTime()
  if (Number.isNaN(ts)) return null
  return Math.max(0, (Date.now() - ts) / (1000 * 60 * 60))
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
  if (!tenantRecord) return withCookies(NextResponse.json({ error: "tenant_not_found" }, { status: 404 }), ctx.cookiesToSet)

  const users = normalizeUsersMap(tenantRecord.users)
  const currentRole = roleForUser(users, ctx.tokenCtx.sub)

  const sourceMap = await readSourcesWithFallback(ddb, ctx.tokenCtx.tenantId, tenantRecord.dataSources)
  const sources = Object.values(sourceMap)
  const connected = sources.filter((source) => source.state === "connected")
  const errored = sources.filter((source) => source.state === "error")
  const scheduled = sources.filter((source) => source.syncMode !== "manual")
  const totalRetries = sources.reduce((sum, source) => sum + Math.max(0, source.retryCount || 0), 0)

  const staleThresholdHours = 24
  const staleSources = connected.filter((source) => {
    if (!source.lastImportAt) return true
    const hours = ageHours(source.lastImportAt)
    return hours !== null && hours > staleThresholdHours
  })

  const recentRuns = sources.flatMap((source) =>
    (source.runs || []).map((run) => ({
      sourceId: source.id,
      provider: source.provider,
      status: run.status,
      finishedAt: run.finishedAt,
    }))
  )

  const last24hCutoff = Date.now() - 24 * 60 * 60 * 1000
  const recent24h = recentRuns.filter((run) => {
    const ts = new Date(run.finishedAt).getTime()
    return !Number.isNaN(ts) && ts >= last24hCutoff
  })
  const failures24h = recent24h.filter((run) => run.status === "error").length
  const success24h = recent24h.filter((run) => run.status === "success").length
  const errorRate24h = recent24h.length > 0 ? (failures24h / recent24h.length) * 100 : 0

  const providerBreakdown = sources.map((source) => ({
    sourceId: source.id,
    provider: source.provider,
    state: source.state,
    syncMode: source.syncMode,
    retryCount: source.retryCount,
    lastError: source.lastError,
    lastImportAt: source.lastImportAt,
    nextImportAt: source.nextImportAt,
    stale: staleSources.some((stale) => stale.id === source.id),
  }))

  return withCookies(
    NextResponse.json({
      currentUserRole: currentRole,
      summary: {
        totalSources: sources.length,
        connected: connected.length,
        errored: errored.length,
        scheduled: scheduled.length,
        stale: staleSources.length,
        totalRetries,
        success24h,
        failures24h,
        errorRate24h: Number(errorRate24h.toFixed(2)),
      },
      providers: providerBreakdown,
    }),
    ctx.cookiesToSet
  )
}
