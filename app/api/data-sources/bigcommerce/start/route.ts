import crypto from "crypto"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { NextRequest, NextResponse } from "next/server"
import { getTokenUserContext, normalizeUsersMap, roleForUser } from "@/lib/tenant-users"
import { getTenantsTableName, readTenantRecord, resolveAwsRegion } from "@/lib/data-sources"
import { sanitizeSelectedObjects } from "@/lib/data-source-catalog"

const BIGCOMMERCE_STATE_COOKIE = "bigcommerce_oauth_state"

export async function GET(request: NextRequest) {
  const { getValidIdToken } = await import("@/lib/server-auth")
  const { idToken, cookiesToSet } = await getValidIdToken()
  if (!idToken) {
    const unauthorized = NextResponse.redirect(new URL("/data-input?bigcommerce=unauthorized", request.url))
    for (const cookie of cookiesToSet) unauthorized.cookies.set(cookie.name, cookie.value, cookie.options)
    return unauthorized
  }

  const tokenCtx = getTokenUserContext(idToken)
  if (!tokenCtx) {
    const missing = NextResponse.redirect(new URL("/data-input?bigcommerce=missing_tenant", request.url))
    for (const cookie of cookiesToSet) missing.cookies.set(cookie.name, cookie.value, cookie.options)
    return missing
  }

  const tableName = getTenantsTableName()
  const region = resolveAwsRegion()
  if (!tableName || !region) {
    const missingConfig = NextResponse.redirect(new URL("/data-input?bigcommerce=missing_config", request.url))
    for (const cookie of cookiesToSet) missingConfig.cookies.set(cookie.name, cookie.value, cookie.options)
    return missingConfig
  }

  const ddb = new DynamoDBClient({ region })
  const tenantRecord = await readTenantRecord(ddb, tableName, tokenCtx.tenantId)
  if (!tenantRecord) {
    const tenantMissing = NextResponse.redirect(new URL("/data-input?bigcommerce=tenant_not_found", request.url))
    for (const cookie of cookiesToSet) tenantMissing.cookies.set(cookie.name, cookie.value, cookie.options)
    return tenantMissing
  }

  const users = normalizeUsersMap(tenantRecord.users)
  const role = roleForUser(users, tokenCtx.sub)
  if (role !== "admin") {
    const forbidden = NextResponse.redirect(new URL("/data-input?bigcommerce=forbidden", request.url))
    for (const cookie of cookiesToSet) forbidden.cookies.set(cookie.name, cookie.value, cookie.options)
    return forbidden
  }

  const clientId = process.env.BIGCOMMERCE_CLIENT_ID || ""
  const selectedTablesRaw = (request.nextUrl.searchParams.get("tables") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
  const scopes = process.env.BIGCOMMERCE_SCOPES || "store_v2_orders store_v2_products store_v2_customers"
  const redirectUri =
    process.env.BIGCOMMERCE_REDIRECT_URI ||
    new URL("/api/data-sources/bigcommerce/callback", request.url).toString()

  if (!clientId) {
    const missingClient = NextResponse.redirect(new URL("/data-input?bigcommerce=missing_client", request.url))
    for (const cookie of cookiesToSet) missingClient.cookies.set(cookie.name, cookie.value, cookie.options)
    return missingClient
  }

  const state = crypto.randomBytes(24).toString("hex")
  const statePayload = Buffer.from(
    JSON.stringify({
      state,
      tenantId: tokenCtx.tenantId,
      requesterSub: tokenCtx.sub,
      selectedTables: sanitizeSelectedObjects("bigcommerce", selectedTablesRaw),
      createdAt: Date.now(),
    }),
    "utf8"
  ).toString("base64url")

  const authorizeUrl = new URL("https://login.bigcommerce.com/oauth2/authorize")
  authorizeUrl.searchParams.set("client_id", clientId)
  authorizeUrl.searchParams.set("scope", scopes)
  authorizeUrl.searchParams.set("redirect_uri", redirectUri)
  authorizeUrl.searchParams.set("response_type", "code")
  authorizeUrl.searchParams.set("state", state)

  const response = NextResponse.redirect(authorizeUrl.toString())
  for (const cookie of cookiesToSet) response.cookies.set(cookie.name, cookie.value, cookie.options)
  response.cookies.set(BIGCOMMERCE_STATE_COOKIE, statePayload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 10,
  })

  return response
}
