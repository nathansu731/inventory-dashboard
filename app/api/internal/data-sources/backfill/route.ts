import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { NextResponse } from "next/server"
import { getTenantsTableName, normalizeSourcesMap, readTenantRecord, resolveAwsRegion } from "@/lib/data-sources"
import { listTenantIdsPage } from "@/lib/data-source-worker"
import { hasDedicatedDataSourcesTable, upsertSourceInDedicatedTable } from "@/lib/data-sources-repo"

type BackfillRequest = {
  limit?: number
  nextToken?: string | null
}

const isAuthorized = (request: Request) => {
  const workerToken = process.env.WORKER_CRON_TOKEN || ""
  if (!workerToken) return false
  const header = request.headers.get("x-worker-token") || ""
  return header === workerToken
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized_worker" }, { status: 401 })
  }

  if (!hasDedicatedDataSourcesTable()) {
    return NextResponse.json({ error: "missing_data_sources_table_config" }, { status: 409 })
  }

  const tableName = getTenantsTableName()
  const region = resolveAwsRegion()
  if (!tableName || !region) {
    return NextResponse.json({ error: "missing_tenants_config" }, { status: 500 })
  }

  const payload = (await request.json().catch(() => ({}))) as BackfillRequest
  const limit = Number.isFinite(Number(payload.limit)) ? Number(payload.limit) : 25
  const nextToken = typeof payload.nextToken === "string" ? payload.nextToken : null

  const ddb = new DynamoDBClient({ region })
  const page = await listTenantIdsPage({
    ddb,
    tableName,
    limit,
    nextToken,
  })

  let processedTenants = 0
  let writtenSources = 0

  for (const tenantId of page.tenantIds) {
    const tenantRecord = await readTenantRecord(ddb, tableName, tenantId)
    if (!tenantRecord) continue

    const sources = normalizeSourcesMap(tenantRecord.dataSources)
    for (const source of Object.values(sources)) {
      await upsertSourceInDedicatedTable(ddb, tenantId, source)
      writtenSources += 1
    }
    processedTenants += 1
  }

  return NextResponse.json({
    pageSize: page.tenantIds.length,
    processedTenants,
    writtenSources,
    nextToken: page.nextToken,
  })
}
