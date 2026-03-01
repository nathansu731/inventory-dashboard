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

const SHOPIFY_STATE_COOKIE = "shopify_oauth_state"

const isValidShopDomain = (value: string) => /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(value)

const safeRedirect = (request: NextRequest, status: string) =>
  NextResponse.redirect(new URL(`/data-input?shopify=${encodeURIComponent(status)}`, request.url))

const validateHmac = (searchParams: URLSearchParams, secret: string) => {
  const providedHmac = searchParams.get("hmac") || ""
  if (!providedHmac) return false

  const message = [...searchParams.entries()]
    .filter(([key]) => key !== "hmac" && key !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&")

  const digest = crypto.createHmac("sha256", secret).update(message).digest("hex")
  const a = Buffer.from(digest, "utf8")
  const b = Buffer.from(providedHmac, "utf8")
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

type ShopifyTokenResponse = {
  access_token: string
  scope?: string
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code") || ""
  const shop = (searchParams.get("shop") || "").trim().toLowerCase()
  const state = searchParams.get("state") || ""

  if (!code || !shop || !state || !isValidShopDomain(shop)) {
    return safeRedirect(request, "invalid_callback")
  }

  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET || ""
  const clientId = process.env.SHOPIFY_CLIENT_ID || ""
  if (!clientSecret || !clientId) {
    return safeRedirect(request, "missing_config")
  }

  if (!validateHmac(searchParams, clientSecret)) {
    return safeRedirect(request, "invalid_hmac")
  }

  const stateCookie = request.cookies.get(SHOPIFY_STATE_COOKIE)?.value || ""
  if (!stateCookie) {
    return safeRedirect(request, "state_missing")
  }

  let statePayload: {
    state: string
    tenantId: string
    requesterSub: string
    shop: string
    selectedTables: string[]
    createdAt: number
  } | null = null
  try {
    const parsed = JSON.parse(Buffer.from(stateCookie, "base64url").toString("utf8")) as {
      state?: string
      tenantId?: string
      requesterSub?: string
      shop?: string
      selectedTables?: unknown
      createdAt?: number
    }
    if (
      typeof parsed.state === "string" &&
      typeof parsed.tenantId === "string" &&
      typeof parsed.requesterSub === "string" &&
      typeof parsed.shop === "string" &&
      typeof parsed.createdAt === "number"
    ) {
      statePayload = {
        state: parsed.state,
        tenantId: parsed.tenantId,
        requesterSub: parsed.requesterSub,
        shop: parsed.shop,
        selectedTables: sanitizeSelectedObjects("shopify", parsed.selectedTables),
        createdAt: parsed.createdAt,
      }
    }
  } catch {
    statePayload = null
  }

  if (!statePayload) return safeRedirect(request, "state_invalid")
  if (Date.now() - statePayload.createdAt > 10 * 60 * 1000) return safeRedirect(request, "state_expired")
  if (statePayload.state !== state || statePayload.shop !== shop) return safeRedirect(request, "state_mismatch")

  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  })

  if (!tokenRes.ok) {
    return safeRedirect(request, "token_exchange_failed")
  }

  const tokenPayload = (await tokenRes.json()) as ShopifyTokenResponse
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

  const sources = normalizeSourcesMap(tenantRecord.dataSources)
  const now = new Date().toISOString()
  const existing = Object.values(sources).find((source) => source.provider === "shopify")
  const sourceId = existing?.id || crypto.randomUUID()

  const nextSource: DataSourceRecord = {
    id: sourceId,
    provider: "shopify",
    accountName: shop,
    accountId: shop,
    state: "connected",
    connectedAt: now,
    selectedTables: sanitizeSelectedObjects("shopify", statePayload.selectedTables ?? existing?.selectedTables),
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

  sources[sourceId] = { ...nextSource, accountId: shop }

  const secretMap =
    typeof tenantRecord.dataSourceSecrets === "object" && tenantRecord.dataSourceSecrets
      ? (tenantRecord.dataSourceSecrets as Record<string, unknown>)
      : {}
  secretMap[sourceId] = {
    provider: "shopify",
    shopDomain: shop,
    accessToken: await encryptSecret(tokenPayload.access_token),
    tokenScope: tokenPayload.scope || "",
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
    provider: "shopify",
    message: `shopify source ${existing ? "reconnected" : "connected"}: ${shop}`,
  })
  tenantRecord.updatedAt = now
  await writeTenantRecord(ddb, tableName, tenantRecord)
  await upsertSourceInDedicatedTable(ddb, statePayload.tenantId, nextSource)

  const response = safeRedirect(request, "connected")
  response.cookies.set(SHOPIFY_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: 0,
  })
  return response
}
