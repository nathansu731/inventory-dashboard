import crypto from "crypto"
import { NextResponse } from "next/server"
import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb"
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb"

const MAX_LIMIT = 100

type SavedReportCriteria = {
  searchText: string
  status: string
  model: string
  dateFrom: string
  dateTo: string
}

type SavedReportDefinition = {
  id: string
  name: string
  criteria: SavedReportCriteria
  createdAt: string
  updatedAt: string
}

const resolveRegion = () => {
  return process.env.AWS_REGION || process.env.COGNITO_REGION || ""
}

const decodeNextToken = (token: string | null) => {
  if (!token) return undefined
  try {
    return JSON.parse(Buffer.from(token, "base64").toString("utf8"))
  } catch {
    return undefined
  }
}

const encodeNextToken = (key?: Record<string, unknown>) => {
  if (!key) return null
  return Buffer.from(JSON.stringify(key), "utf8").toString("base64")
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

const parseItem = (item: Record<string, unknown>): SavedReportDefinition | null => {
  if (typeof item.id !== "string" || typeof item.name !== "string") return null
  const criteria = sanitizeCriteria(item.criteria)
  return {
    id: item.id,
    name: item.name,
    criteria,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : "",
  }
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

const withCookies = (response: NextResponse, cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) => {
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  return response
}

export async function GET(request: Request) {
  const { error, cookiesToSet, tenantId } = await getTenantContext()
  if (error) return withCookies(error, cookiesToSet)

  const tableName = process.env.SAVED_REPORTS_TABLE || ""
  const region = resolveRegion()
  if (!tableName || !region) {
    return withCookies(NextResponse.json({ error: "missing_saved_reports_config" }, { status: 500 }), cookiesToSet)
  }

  const { searchParams } = new URL(request.url)
  const limitRaw = Number(searchParams.get("limit") ?? "50")
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(MAX_LIMIT, limitRaw)) : 50
  const nextToken = searchParams.get("nextToken")

  const ddb = new DynamoDBClient({ region })
  const result = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "tenantId = :tenantId",
      ExpressionAttributeValues: {
        ":tenantId": { S: tenantId },
      },
      Limit: limit,
      ExclusiveStartKey: decodeNextToken(nextToken),
    }),
  )

  const items = (result.Items ?? [])
    .map((it) => parseItem(unmarshall(it) as Record<string, unknown>))
    .filter((it): it is SavedReportDefinition => Boolean(it))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  return withCookies(
    NextResponse.json({
      items,
      nextToken: encodeNextToken(result.LastEvaluatedKey as Record<string, unknown> | undefined),
    }),
    cookiesToSet,
  )
}

export async function POST(request: Request) {
  const { error, cookiesToSet, tenantId } = await getTenantContext()
  if (error) return withCookies(error, cookiesToSet)

  const tableName = process.env.SAVED_REPORTS_TABLE || ""
  const region = resolveRegion()
  if (!tableName || !region) {
    return withCookies(NextResponse.json({ error: "missing_saved_reports_config" }, { status: 500 }), cookiesToSet)
  }

  const payload = (await request.json().catch(() => null)) as {
    id?: string
    name?: string
    criteria?: unknown
  } | null

  const name = typeof payload?.name === "string" ? payload.name.trim() : ""
  if (!name) {
    return withCookies(NextResponse.json({ error: "missing_name" }, { status: 400 }), cookiesToSet)
  }

  const id = typeof payload?.id === "string" && payload.id.trim() ? payload.id.trim() : `SR-${crypto.randomUUID()}`
  const now = new Date().toISOString()
  const criteria = sanitizeCriteria(payload?.criteria)

  const ddb = new DynamoDBClient({ region })

  let createdAt = now
  const existing = await ddb.send(
    new GetItemCommand({
      TableName: tableName,
      Key: marshall({ tenantId, id }),
      ConsistentRead: true,
    }),
  )

  if (existing.Item) {
    const parsed = unmarshall(existing.Item) as Record<string, unknown>
    if (typeof parsed.createdAt === "string" && parsed.createdAt) {
      createdAt = parsed.createdAt
    }
  }

  const item = {
    tenantId,
    id,
    name,
    criteria,
    createdAt,
    updatedAt: now,
  }

  await ddb.send(
    new PutItemCommand({
      TableName: tableName,
      Item: marshall(item, { removeUndefinedValues: true }),
    }),
  )

  return withCookies(NextResponse.json(item), cookiesToSet)
}
