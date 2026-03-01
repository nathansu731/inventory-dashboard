import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { NextResponse } from "next/server"
import { getTokenUserContext } from "@/lib/tenant-users"
import { getTenantsTableName, readTenantRecord, resolveAwsRegion } from "@/lib/data-sources"
import { readSourcesWithFallback } from "@/lib/data-sources-repo"
import { discoverDataSourceCatalog } from "@/lib/data-source-discovery"

type CookieToSet = { name: string; value: string; options: Record<string, unknown> }

const withCookies = (response: NextResponse, cookiesToSet: CookieToSet[]) => {
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  return response
}

export async function GET() {
  const { getValidIdToken } = await import("@/lib/server-auth")
  const { idToken, cookiesToSet } = await getValidIdToken()
  if (!idToken) {
    return withCookies(NextResponse.json({ error: "unauthorized" }, { status: 401 }), cookiesToSet)
  }

  const tokenCtx = getTokenUserContext(idToken)
  if (!tokenCtx) {
    return withCookies(NextResponse.json({ error: "missing_tenant" }, { status: 403 }), cookiesToSet)
  }

  const tableName = getTenantsTableName()
  const region = resolveAwsRegion()
  if (!tableName || !region) {
    return withCookies(NextResponse.json({ error: "missing_tenants_config" }, { status: 500 }), cookiesToSet)
  }

  const ddb = new DynamoDBClient({ region })
  const tenantRecord = await readTenantRecord(ddb, tableName, tokenCtx.tenantId)
  if (!tenantRecord) {
    return withCookies(NextResponse.json({ error: "tenant_not_found" }, { status: 404 }), cookiesToSet)
  }

  const sourceMap = await readSourcesWithFallback(ddb, tokenCtx.tenantId, tenantRecord.dataSources)
  const providers = await discoverDataSourceCatalog(tenantRecord, sourceMap)
  return withCookies(NextResponse.json({ providers }), cookiesToSet)
}
