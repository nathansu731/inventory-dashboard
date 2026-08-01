import { NextResponse } from "next/server"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { getTenantsTableName, putTenantRecord, resolveAwsRegion } from "@/lib/tenant-users"
import { getAuthenticatedApiContext, withAuthCookies } from "@/lib/server-auth"

const normalizeCompanyName = (value: unknown) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : ""

export async function PUT(request: Request) {
  const { cookiesToSet, errorResponse, tenantRecord, tokenCtx } = await getAuthenticatedApiContext()
  if (errorResponse) return errorResponse
  if (!tenantRecord || !tokenCtx) {
    return withAuthCookies(NextResponse.json({ error: "missing_tenant" }, { status: 403 }), cookiesToSet)
  }

  const payload = (await request.json().catch(() => null)) as { companyName?: unknown } | null
  const companyName = normalizeCompanyName(payload?.companyName)
  if (companyName.length > 120) {
    return withAuthCookies(
      NextResponse.json({ error: "company_name_too_long" }, { status: 400 }),
      cookiesToSet,
    )
  }

  const tableName = getTenantsTableName()
  const region = resolveAwsRegion()
  if (!tableName || !region) {
    return withAuthCookies(NextResponse.json({ error: "tenant_storage_not_configured" }, { status: 500 }), cookiesToSet)
  }

  try {
    if (companyName) tenantRecord.companyName = companyName
    else delete tenantRecord.companyName
    tenantRecord.updatedAt = new Date().toISOString()

    await putTenantRecord(new DynamoDBClient({ region }), tableName, tenantRecord)

    return withAuthCookies(NextResponse.json({ companyName: companyName || null }), cookiesToSet)
  } catch {
    return withAuthCookies(NextResponse.json({ error: "failed_to_save_company_name" }, { status: 500 }), cookiesToSet)
  }
}
