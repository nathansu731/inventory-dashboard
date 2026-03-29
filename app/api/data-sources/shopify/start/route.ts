import crypto from "crypto"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { NextRequest, NextResponse } from "next/server"
import { getTokenUserContext, normalizeUsersMap, roleForUser } from "@/lib/tenant-users"
import { getTenantsTableName, readTenantRecord, resolveAwsRegion } from "@/lib/data-sources"
import { sanitizeAvailableObjects, sanitizeSelectedObjects } from "@/lib/data-source-catalog"

const SHOPIFY_STATE_COOKIE = "shopify_oauth_state"

const isValidShopDomain = (value: string) => /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(value)

export async function GET(request: NextRequest) {
  const { getValidIdToken } = await import("@/lib/server-auth")
  const { idToken, cookiesToSet } = await getValidIdToken()
  if (!idToken) {
    const unauthorized = NextResponse.redirect(new URL("/data-input?shopify=unauthorized", request.url))
    for (const cookie of cookiesToSet) unauthorized.cookies.set(cookie.name, cookie.value, cookie.options)
    return unauthorized
  }

  const tokenCtx = getTokenUserContext(idToken)
  if (!tokenCtx) {
    const missing = NextResponse.redirect(new URL("/data-input?shopify=missing_tenant", request.url))
    for (const cookie of cookiesToSet) missing.cookies.set(cookie.name, cookie.value, cookie.options)
    return missing
  }

  const tableName = getTenantsTableName()
  const region = resolveAwsRegion()
  if (!tableName || !region) {
    const missingConfig = NextResponse.redirect(new URL("/data-input?shopify=missing_config", request.url))
    for (const cookie of cookiesToSet) missingConfig.cookies.set(cookie.name, cookie.value, cookie.options)
    return missingConfig
  }

  const ddb = new DynamoDBClient({ region })
  const tenantRecord = await readTenantRecord(ddb, tableName, tokenCtx.tenantId)
  if (!tenantRecord) {
    const tenantMissing = NextResponse.redirect(new URL("/data-input?shopify=tenant_not_found", request.url))
    for (const cookie of cookiesToSet) tenantMissing.cookies.set(cookie.name, cookie.value, cookie.options)
    return tenantMissing
  }

  const users = normalizeUsersMap(tenantRecord.users)
  const role = roleForUser(users, tokenCtx.sub)
  if (role !== "admin") {
    const forbidden = NextResponse.redirect(new URL("/data-input?shopify=forbidden", request.url))
    for (const cookie of cookiesToSet) forbidden.cookies.set(cookie.name, cookie.value, cookie.options)
    return forbidden
  }

  const shopRaw = request.nextUrl.searchParams.get("shop") || ""
  const shop = shopRaw.trim().toLowerCase()
  const selectedTablesRaw = (request.nextUrl.searchParams.get("tables") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
  const availableTablesRaw = (request.nextUrl.searchParams.get("allTables") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
  if (!isValidShopDomain(shop)) {
    const invalid = NextResponse.redirect(new URL("/data-input?shopify=invalid_shop", request.url))
    for (const cookie of cookiesToSet) invalid.cookies.set(cookie.name, cookie.value, cookie.options)
    return invalid
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID || ""
  const scopes = process.env.SHOPIFY_SCOPES || "read_orders,read_products,read_inventory"
  const redirectUri = process.env.SHOPIFY_REDIRECT_URI || new URL("/api/data-sources/shopify/callback", request.url).toString()
  if (!clientId) {
    const missingClient = NextResponse.redirect(new URL("/data-input?shopify=missing_client", request.url))
    for (const cookie of cookiesToSet) missingClient.cookies.set(cookie.name, cookie.value, cookie.options)
    return missingClient
  }

  const state = crypto.randomBytes(24).toString("hex")
  const statePayload = Buffer.from(
    JSON.stringify({
      state,
      tenantId: tokenCtx.tenantId,
      requesterSub: tokenCtx.sub,
      shop,
      availableTables: sanitizeAvailableObjects("shopify", availableTablesRaw),
      selectedTables: sanitizeSelectedObjects("shopify", selectedTablesRaw),
      createdAt: Date.now(),
    }),
    "utf8"
  ).toString("base64url")

  const authorizeUrl = new URL(`https://${shop}/admin/oauth/authorize`)
  authorizeUrl.searchParams.set("client_id", clientId)
  authorizeUrl.searchParams.set("scope", scopes)
  authorizeUrl.searchParams.set("redirect_uri", redirectUri)
  authorizeUrl.searchParams.set("state", state)

  const response = NextResponse.redirect(authorizeUrl.toString())
  for (const cookie of cookiesToSet) response.cookies.set(cookie.name, cookie.value, cookie.options)
  response.cookies.set(SHOPIFY_STATE_COOKIE, statePayload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 10,
  })

  return response
}
