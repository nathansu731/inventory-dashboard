import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { NextResponse } from "next/server"
import { getTenantsTableName, readTenantRecord, resolveAwsRegion } from "@/lib/data-sources"
import { readSourcesWithFallback } from "@/lib/data-sources-repo"
import { discoverDataSourceCatalog } from "@/lib/data-source-discovery"
import { PROVIDER_BLUEPRINTS } from "@/lib/provider-source-config"

type CookieToSet = { name: string; value: string; options: Record<string, unknown> }

const withCookies = (response: NextResponse, cookiesToSet: CookieToSet[]) => {
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  return response
}

export async function GET() {
  const { getAuthenticatedApiContext } = await import("@/lib/server-auth")
  const { cookiesToSet, tokenCtx, errorResponse } = await getAuthenticatedApiContext()
  if (!tokenCtx) {
    return withCookies(errorResponse!, cookiesToSet)
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
  return withCookies(NextResponse.json({ providers, blueprints: PROVIDER_BLUEPRINTS }), cookiesToSet)
}
