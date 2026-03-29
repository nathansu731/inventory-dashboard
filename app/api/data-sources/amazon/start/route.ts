import crypto from "crypto"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { NextRequest, NextResponse } from "next/server"
import { getTokenUserContext, normalizeUsersMap, roleForUser } from "@/lib/tenant-users"
import { getTenantsTableName, readTenantRecord, resolveAwsRegion } from "@/lib/data-sources"
import { sanitizeAvailableObjects, sanitizeSelectedObjects } from "@/lib/data-source-catalog"

const AMAZON_STATE_COOKIE = "amazon_oauth_state"

export async function GET(request: NextRequest) {
  const { getValidIdToken } = await import("@/lib/server-auth")
  const { idToken, cookiesToSet } = await getValidIdToken()
  if (!idToken) {
    const unauthorized = NextResponse.redirect(new URL("/data-input?amazon=unauthorized", request.url))
    for (const cookie of cookiesToSet) unauthorized.cookies.set(cookie.name, cookie.value, cookie.options)
    return unauthorized
  }

  const tokenCtx = getTokenUserContext(idToken)
  if (!tokenCtx) {
    const missing = NextResponse.redirect(new URL("/data-input?amazon=missing_tenant", request.url))
    for (const cookie of cookiesToSet) missing.cookies.set(cookie.name, cookie.value, cookie.options)
    return missing
  }

  const tableName = getTenantsTableName()
  const region = resolveAwsRegion()
  if (!tableName || !region) {
    const missingConfig = NextResponse.redirect(new URL("/data-input?amazon=missing_config", request.url))
    for (const cookie of cookiesToSet) missingConfig.cookies.set(cookie.name, cookie.value, cookie.options)
    return missingConfig
  }

  const ddb = new DynamoDBClient({ region })
  const tenantRecord = await readTenantRecord(ddb, tableName, tokenCtx.tenantId)
  if (!tenantRecord) {
    const tenantMissing = NextResponse.redirect(new URL("/data-input?amazon=tenant_not_found", request.url))
    for (const cookie of cookiesToSet) tenantMissing.cookies.set(cookie.name, cookie.value, cookie.options)
    return tenantMissing
  }

  const users = normalizeUsersMap(tenantRecord.users)
  const role = roleForUser(users, tokenCtx.sub)
  if (role !== "admin") {
    const forbidden = NextResponse.redirect(new URL("/data-input?amazon=forbidden", request.url))
    for (const cookie of cookiesToSet) forbidden.cookies.set(cookie.name, cookie.value, cookie.options)
    return forbidden
  }

  const appId = process.env.AMAZON_SP_APPLICATION_ID || ""
  const selectedTablesRaw = (request.nextUrl.searchParams.get("tables") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
  const availableTablesRaw = (request.nextUrl.searchParams.get("allTables") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
  const redirectUri =
    process.env.AMAZON_REDIRECT_URI ||
    new URL("/api/data-sources/amazon/callback", request.url).toString()
  const sellerCentralBase = process.env.AMAZON_SELLER_CENTRAL_URL || "https://sellercentral.amazon.com"

  if (!appId) {
    const missingClient = NextResponse.redirect(new URL("/data-input?amazon=missing_client", request.url))
    for (const cookie of cookiesToSet) missingClient.cookies.set(cookie.name, cookie.value, cookie.options)
    return missingClient
  }

  const state = crypto.randomBytes(24).toString("hex")
  const statePayload = Buffer.from(
    JSON.stringify({
      state,
      tenantId: tokenCtx.tenantId,
      requesterSub: tokenCtx.sub,
      availableTables: sanitizeAvailableObjects("amazon", availableTablesRaw),
      selectedTables: sanitizeSelectedObjects("amazon", selectedTablesRaw),
      createdAt: Date.now(),
    }),
    "utf8"
  ).toString("base64url")

  const authorizeUrl = new URL(`${sellerCentralBase}/apps/authorize/consent`)
  authorizeUrl.searchParams.set("application_id", appId)
  authorizeUrl.searchParams.set("state", state)
  authorizeUrl.searchParams.set("redirect_uri", redirectUri)
  authorizeUrl.searchParams.set("version", "beta")

  const response = NextResponse.redirect(authorizeUrl.toString())
  for (const cookie of cookiesToSet) response.cookies.set(cookie.name, cookie.value, cookie.options)
  response.cookies.set(AMAZON_STATE_COOKIE, statePayload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 10,
  })

  return response
}
