import crypto from "crypto"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { NextRequest, NextResponse } from "next/server"
import {
  getTenantsTableName,
  normalizeSourcesMap,
  readTenantRecord,
  resolveAwsRegion,
  writeTenantRecord,
  type DataSourceRecord,
} from "@/lib/data-sources"
import { normalizeUsersMap, roleForUser } from "@/lib/tenant-users"
import { encryptSecret } from "@/lib/data-source-secrets"
import { appendDataSourceAudit } from "@/lib/data-source-audit"
import { upsertSourceInDedicatedTable } from "@/lib/data-sources-repo"
import { sanitizeSelectedObjects } from "@/lib/data-source-catalog"

const BIGCOMMERCE_STATE_COOKIE = "bigcommerce_oauth_state"

const safeRedirect = (request: NextRequest, status: string) =>
  NextResponse.redirect(new URL(`/data-input?bigcommerce=${encodeURIComponent(status)}`, request.url))

type BigCommerceTokenResponse = {
  access_token: string
  scope?: string
  context?: string
  user?: { email?: string; id?: number }
}

const extractStoreHash = (context: string) => {
  if (!context) return ""
  const parts = context.split("/")
  return parts[1] || ""
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code") || ""
  const scope = searchParams.get("scope") || ""
  const context = searchParams.get("context") || ""
  const state = searchParams.get("state") || ""

  if (!code || !state || !context) {
    return safeRedirect(request, "invalid_callback")
  }

  const clientId = process.env.BIGCOMMERCE_CLIENT_ID || ""
  const clientSecret = process.env.BIGCOMMERCE_CLIENT_SECRET || ""
  const redirectUri =
    process.env.BIGCOMMERCE_REDIRECT_URI ||
    new URL("/api/data-sources/bigcommerce/callback", request.url).toString()
  if (!clientId || !clientSecret) {
    return safeRedirect(request, "missing_config")
  }

  const stateCookie = request.cookies.get(BIGCOMMERCE_STATE_COOKIE)?.value || ""
  if (!stateCookie) {
    return safeRedirect(request, "state_missing")
  }

  let statePayload: { state: string; tenantId: string; requesterSub: string; selectedTables: string[]; createdAt: number } | null = null
  try {
    const parsed = JSON.parse(Buffer.from(stateCookie, "base64url").toString("utf8")) as {
      state?: string
      tenantId?: string
      requesterSub?: string
      selectedTables?: unknown
      createdAt?: number
    }
    if (
      typeof parsed.state === "string" &&
      typeof parsed.tenantId === "string" &&
      typeof parsed.requesterSub === "string" &&
      typeof parsed.createdAt === "number"
    ) {
      statePayload = {
        state: parsed.state,
        tenantId: parsed.tenantId,
        requesterSub: parsed.requesterSub,
        selectedTables: sanitizeSelectedObjects("bigcommerce", parsed.selectedTables),
        createdAt: parsed.createdAt,
      }
    }
  } catch {
    statePayload = null
  }

  if (!statePayload) return safeRedirect(request, "state_invalid")
  if (Date.now() - statePayload.createdAt > 10 * 60 * 1000) return safeRedirect(request, "state_expired")
  if (statePayload.state !== state) return safeRedirect(request, "state_mismatch")

  const tokenRes = await fetch("https://login.bigcommerce.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code,
      scope,
      context,
    }),
  })

  if (!tokenRes.ok) {
    return safeRedirect(request, "token_exchange_failed")
  }

  const tokenPayload = (await tokenRes.json()) as BigCommerceTokenResponse
  if (!tokenPayload?.access_token) {
    return safeRedirect(request, "token_missing")
  }

  const tableName = getTenantsTableName()
  const region = resolveAwsRegion()
  if (!tableName || !region) return safeRedirect(request, "missing_tenants_config")

  const ddb = new DynamoDBClient({ region })
  const tenantRecord = await readTenantRecord(ddb, tableName, statePayload.tenantId)
  if (!tenantRecord) return safeRedirect(request, "tenant_not_found")

  const users = normalizeUsersMap(tenantRecord.users)
  const role = roleForUser(users, statePayload.requesterSub)
  if (role !== "admin") return safeRedirect(request, "forbidden")

  const storeHash = extractStoreHash(tokenPayload.context || context)
  if (!storeHash) return safeRedirect(request, "invalid_context")

  const sources = normalizeSourcesMap(tenantRecord.dataSources)
  const now = new Date().toISOString()
  const existing = Object.values(sources).find((source) => source.provider === "bigcommerce")
  const sourceId = existing?.id || crypto.randomUUID()

  const nextSource: DataSourceRecord = {
    id: sourceId,
    provider: "bigcommerce",
    accountName: `BigCommerce ${storeHash}`,
    accountId: storeHash,
    state: "connected",
    connectedAt: now,
    selectedTables: sanitizeSelectedObjects("bigcommerce", statePayload.selectedTables ?? existing?.selectedTables),
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

  const secretMap =
    typeof tenantRecord.dataSourceSecrets === "object" && tenantRecord.dataSourceSecrets
      ? (tenantRecord.dataSourceSecrets as Record<string, unknown>)
      : {}
  secretMap[sourceId] = {
    provider: "bigcommerce",
    context: tokenPayload.context || context,
    storeHash,
    accessToken: await encryptSecret(tokenPayload.access_token),
    scope: tokenPayload.scope || scope,
    userEmail: tokenPayload.user?.email || "",
    userId: tokenPayload.user?.id || null,
    obtainedAt: now,
    updatedAt: now,
  }

  tenantRecord.dataSources = sources
  tenantRecord.dataSourceSecrets = secretMap
  appendDataSourceAudit({
    tenantRecord,
    type: existing ? "source_reconnected" : "source_connected",
    actor: statePayload.requesterSub,
    actorType: "user",
    sourceId,
    provider: "bigcommerce",
    message: `bigcommerce source ${existing ? "reconnected" : "connected"}: ${storeHash}`,
  })
  tenantRecord.updatedAt = now
  await writeTenantRecord(ddb, tableName, tenantRecord)
  await upsertSourceInDedicatedTable(ddb, statePayload.tenantId, nextSource)

  const response = safeRedirect(request, "connected")
  response.cookies.set(BIGCOMMERCE_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: 0,
  })
  return response
}
