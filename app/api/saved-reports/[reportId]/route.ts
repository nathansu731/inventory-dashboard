import { NextResponse } from "next/server"
import { DeleteItemCommand, DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb"
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb"

const resolveRegion = () => {
  return process.env.AWS_REGION || process.env.COGNITO_REGION || ""
}

type SavedReportCriteria = {
  searchText: string
  status: string
  model: string
  dateFrom: string
  dateTo: string
}

const sanitizeCriteria = (input: unknown): SavedReportCriteria => {
  const obj = typeof input === "object" && input ? (input as Record<string, unknown>) : {}
  return {
    searchText: typeof obj.searchText === "string" ? obj.searchText : "",
    status: typeof obj.status === "string" ? obj.status : "all",
    model: typeof obj.model === "string" ? obj.model : "all",
    dateFrom: typeof obj.dateFrom === "string" ? obj.dateFrom : "",
    dateTo: typeof obj.dateTo === "string" ? obj.dateTo : "",
  }
}

const withCookies = (response: NextResponse, cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) => {
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  return response
}

const getTenantContext = async () => {
  const { getValidIdToken } = await import("@/lib/server-auth")
  const { getTenantIdFromToken } = await import("@/lib/auth")

  const { idToken, cookiesToSet } = await getValidIdToken()
  if (!idToken) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }), cookiesToSet, tenantId: "" }
  }

  const tenantId = getTenantIdFromToken(idToken)
  if (!tenantId) {
    return { error: NextResponse.json({ error: "missing_tenant" }, { status: 403 }), cookiesToSet, tenantId: "" }
  }

  return { error: null, cookiesToSet, tenantId }
}

export async function GET(_request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const { error, cookiesToSet, tenantId } = await getTenantContext()
  if (error) return withCookies(error, cookiesToSet)

  const tableName = process.env.SAVED_REPORTS_TABLE || ""
  const region = resolveRegion()
  if (!tableName || !region) {
    return withCookies(NextResponse.json({ error: "missing_saved_reports_config" }, { status: 500 }), cookiesToSet)
  }

  const { reportId } = await params
  if (!reportId) {
    return withCookies(NextResponse.json({ error: "missing_report_id" }, { status: 400 }), cookiesToSet)
  }

  const ddb = new DynamoDBClient({ region })
  const result = await ddb.send(
    new GetItemCommand({
      TableName: tableName,
      Key: marshall({ tenantId, id: reportId }),
      ConsistentRead: true,
    }),
  )

  if (!result.Item) {
    return withCookies(NextResponse.json({ error: "not_found" }, { status: 404 }), cookiesToSet)
  }

  const parsed = unmarshall(result.Item) as Record<string, unknown>
  return withCookies(
    NextResponse.json({
      id: parsed.id,
      name: parsed.name,
      criteria: sanitizeCriteria(parsed.criteria),
      createdAt: parsed.createdAt,
      updatedAt: parsed.updatedAt,
    }),
    cookiesToSet,
  )
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const { error, cookiesToSet, tenantId } = await getTenantContext()
  if (error) return withCookies(error, cookiesToSet)

  const tableName = process.env.SAVED_REPORTS_TABLE || ""
  const region = resolveRegion()
  if (!tableName || !region) {
    return withCookies(NextResponse.json({ error: "missing_saved_reports_config" }, { status: 500 }), cookiesToSet)
  }

  const { reportId } = await params
  if (!reportId) {
    return withCookies(NextResponse.json({ error: "missing_report_id" }, { status: 400 }), cookiesToSet)
  }

  const ddb = new DynamoDBClient({ region })
  await ddb.send(
    new DeleteItemCommand({
      TableName: tableName,
      Key: marshall({ tenantId, id: reportId }),
    }),
  )

  return withCookies(NextResponse.json({ ok: true }), cookiesToSet)
}
