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
import { sanitizeAvailableObjects, sanitizeSelectedObjects } from "@/lib/data-source-catalog"

const AMAZON_STATE_COOKIE = "amazon_oauth_state"

const safeRedirect = (request: NextRequest, status: string) =>
  NextResponse.redirect(new URL(`/data-input?amazon=${encodeURIComponent(status)}`, request.url))

type AmazonTokenResponse = {
  access_token?: string
  refresh_token?: string
  token_type?: string
  expires_in?: number
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const state = searchParams.get("state") || ""
  const spapiOauthCode = searchParams.get("spapi_oauth_code") || ""
  const sellerId = (searchParams.get("selling_partner_id") || "").trim()

  if (!state || !spapiOauthCode || !sellerId) {
    return safeRedirect(request, "invalid_callback")
  }

  const clientId = process.env.AMAZON_LWA_CLIENT_ID || ""
  const clientSecret = process.env.AMAZON_LWA_CLIENT_SECRET || ""
  const redirectUri =
    process.env.AMAZON_REDIRECT_URI ||
    new URL("/api/data-sources/amazon/callback", request.url).toString()
  if (!clientId || !clientSecret) {
    return safeRedirect(request, "missing_config")
  }

  const stateCookie = request.cookies.get(AMAZON_STATE_COOKIE)?.value || ""
  if (!stateCookie) {
    return safeRedirect(request, "state_missing")
  }

  let statePayload: { state: string; tenantId: string; requesterSub: string; availableTables: string[]; selectedTables: string[]; createdAt: number } | null = null
  try {
    const parsed = JSON.parse(Buffer.from(stateCookie, "base64url").toString("utf8")) as {
      state?: string
      tenantId?: string
      requesterSub?: string
      availableTables?: unknown
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
        availableTables: sanitizeAvailableObjects("amazon", parsed.availableTables),
        selectedTables: sanitizeSelectedObjects("amazon", parsed.selectedTables),
        createdAt: parsed.createdAt,
      }
    }
  } catch {
    statePayload = null
  }

  if (!statePayload) return safeRedirect(request, "state_invalid")
  if (Date.now() - statePayload.createdAt > 10 * 60 * 1000) return safeRedirect(request, "state_expired")
  if (statePayload.state !== state) return safeRedirect(request, "state_mismatch")

  const tokenRes = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: spapiOauthCode,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  })

  if (!tokenRes.ok) {
    return safeRedirect(request, "token_exchange_failed")
  }

  const tokenPayload = (await tokenRes.json()) as AmazonTokenResponse
  if (!tokenPayload?.refresh_token) {
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

  const sources = normalizeSourcesMap(tenantRecord.dataSources)
  const now = new Date().toISOString()
  const existing = Object.values(sources).find((source) => source.provider === "amazon")
  const sourceId = existing?.id || crypto.randomUUID()

  const nextSource: DataSourceRecord = {
    id: sourceId,
    provider: "amazon",
    accountName: `Amazon ${sellerId}`,
    accountId: sellerId,
    state: "connected",
    connectedAt: now,
    availableTables: sanitizeAvailableObjects("amazon", statePayload.availableTables ?? existing?.availableTables),
    selectedTables: sanitizeSelectedObjects("amazon", statePayload.selectedTables ?? existing?.selectedTables),
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
    provider: "amazon",
    sellingPartnerId: sellerId,
    refreshToken: await encryptSecret(tokenPayload.refresh_token),
    accessToken: tokenPayload.access_token ? await encryptSecret(tokenPayload.access_token) : undefined,
    tokenType: tokenPayload.token_type || "bearer",
    expiresIn: tokenPayload.expires_in || 0,
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
    provider: "amazon",
    message: `amazon source ${existing ? "reconnected" : "connected"}: ${sellerId}`,
  })
  tenantRecord.updatedAt = now
  await writeTenantRecord(ddb, tableName, tenantRecord)
  await upsertSourceInDedicatedTable(ddb, statePayload.tenantId, nextSource)

  const response = safeRedirect(request, "connected")
  response.cookies.set(AMAZON_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: 0,
  })
  return response
}
