import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { NextResponse } from "next/server"
import { emitConnectorNotification } from "@/lib/connector-notifications"
import { runSourceSync } from "@/lib/data-source-sync"
import {
  getTenantsTableName,
  readTenantRecord,
  resolveAwsRegion,
  writeTenantRecord,
} from "@/lib/data-sources"
import {
  acquireTenantSyncLock,
  acquireSourceSyncLock,
  listTenantIdsPage,
  makeWorkerOwnerId,
  releaseSourceSyncLock,
  releaseTenantSyncLock,
} from "@/lib/data-source-worker"
import { appendDataSourceAudit } from "@/lib/data-source-audit"
import {
  hasDedicatedDataSourcesTable,
  listDueSourcesPage,
  readSourcesWithFallback,
  upsertSourceInDedicatedTable,
} from "@/lib/data-sources-repo"

type WorkerRequest = {
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

  const tableName = getTenantsTableName()
  const region = resolveAwsRegion()
  if (!tableName || !region) {
    return NextResponse.json({ error: "missing_tenants_config" }, { status: 500 })
  }

  const payload = (await request.json().catch(() => ({}))) as WorkerRequest
  const limit = Number.isFinite(Number(payload.limit)) ? Number(payload.limit) : 25
  const nextToken = typeof payload.nextToken === "string" ? payload.nextToken : null

  const ddb = new DynamoDBClient({ region })
  let processedTenants = 0
  let lockedSkipped = 0
  let totalSourcesProcessed = 0
  let totalSourcesFailed = 0
  let totalSourcesSkippedInProgress = 0

  const useDedicatedDueIndex = hasDedicatedDataSourcesTable()

  if (useDedicatedDueIndex) {
    const dueAtIso = new Date().toISOString()
    const duePage = await listDueSourcesPage({
      ddb,
      dueAtIso,
      limit,
      nextToken,
    })

    let processedItems = 0

    for (const dueItem of duePage.items) {
      const { tenantId, sourceId } = dueItem
      const owner = makeWorkerOwnerId()
      const locked = await acquireTenantSyncLock({
        ddb,
        tableName,
        tenantId,
        owner,
        ttlSeconds: 300,
      })

      if (!locked) {
        lockedSkipped += 1
        continue
      }

      try {
        const tenantRecord = await readTenantRecord(ddb, tableName, tenantId)
        if (!tenantRecord) continue

        const sources = await readSourcesWithFallback(ddb, tenantId, tenantRecord.dataSources)
        const current = sources[sourceId]
        if (!current) continue
        if (!(current.state === "connected" && current.syncMode !== "manual" && current.selectedTables.length > 0)) {
          continue
        }
        if (!current.nextImportAt || current.nextImportAt > dueAtIso) continue

        const sourceOwner = makeWorkerOwnerId()
        const sourceLocked = await acquireSourceSyncLock({
          ddb,
          tableName,
          tenantId,
          sourceId,
          owner: sourceOwner,
          ttlSeconds: 180,
        })
        if (!sourceLocked) {
          totalSourcesSkippedInProgress += 1
          continue
        }

        try {
          const result = await runSourceSync(tenantRecord, sourceId, current)
          sources[sourceId] = result.source
          await upsertSourceInDedicatedTable(ddb, tenantId, result.source)
          appendDataSourceAudit({
            tenantRecord,
            type: result.ok ? "source_sync_worker_success" : "source_sync_worker_failed",
            actor: "system-worker",
            actorType: "system",
            sourceId,
            provider: result.source.provider,
            message: result.run.message,
          })
          totalSourcesProcessed += 1
          if (!result.ok) totalSourcesFailed += 1

          try {
            await emitConnectorNotification({
              tenantId,
              source: result.source,
              run: result.run,
            })
          } catch {
            // best effort
          }
        } finally {
          await releaseSourceSyncLock({
            ddb,
            tableName,
            tenantId,
            sourceId,
            owner: sourceOwner,
          })
        }

        tenantRecord.dataSources = sources
        tenantRecord.updatedAt = new Date().toISOString()
        await writeTenantRecord(ddb, tableName, tenantRecord)
        processedItems += 1
      } finally {
        await releaseTenantSyncLock({
          ddb,
          tableName,
          tenantId,
          owner,
        })
      }
    }

    return NextResponse.json({
      mode: "due-index",
      pageSize: duePage.items.length,
      processedTenants: processedItems,
      lockedSkipped,
      totalSourcesProcessed,
      totalSourcesFailed,
      totalSourcesSkippedInProgress,
      nextToken: duePage.nextToken,
    })
  }

  const page = await listTenantIdsPage({
    ddb,
    tableName,
    limit,
    nextToken,
  })

  for (const tenantId of page.tenantIds) {
    const owner = makeWorkerOwnerId()
    const locked = await acquireTenantSyncLock({
      ddb,
      tableName,
      tenantId,
      owner,
      ttlSeconds: 300,
    })

    if (!locked) {
      lockedSkipped += 1
      continue
    }

    try {
      const tenantRecord = await readTenantRecord(ddb, tableName, tenantId)
      if (!tenantRecord) continue

      const sources = await readSourcesWithFallback(ddb, tenantId, tenantRecord.dataSources)
      const now = new Date().toISOString()
      const dueIds = Object.values(sources)
        .filter(
          (source) =>
            source.state === "connected" &&
            source.syncMode !== "manual" &&
            source.selectedTables.length > 0 &&
            source.nextImportAt &&
            source.nextImportAt <= now
        )
        .map((source) => source.id)

      if (dueIds.length === 0) {
        processedTenants += 1
        continue
      }

      for (const sourceId of dueIds) {
        const current = sources[sourceId]
        if (!current) continue

        const sourceOwner = makeWorkerOwnerId()
        const sourceLocked = await acquireSourceSyncLock({
          ddb,
          tableName,
          tenantId,
          sourceId,
          owner: sourceOwner,
          ttlSeconds: 180,
        })
        if (!sourceLocked) {
          totalSourcesSkippedInProgress += 1
          continue
        }

        try {
          const result = await runSourceSync(tenantRecord, sourceId, current)
          sources[sourceId] = result.source
          await upsertSourceInDedicatedTable(ddb, tenantId, result.source)
          appendDataSourceAudit({
            tenantRecord,
            type: result.ok ? "source_sync_worker_success" : "source_sync_worker_failed",
            actor: "system-worker",
            actorType: "system",
            sourceId,
            provider: result.source.provider,
            message: result.run.message,
          })
          totalSourcesProcessed += 1
          if (!result.ok) totalSourcesFailed += 1

          try {
            await emitConnectorNotification({
              tenantId,
              source: result.source,
              run: result.run,
            })
          } catch {
            // best effort
          }
        } finally {
          await releaseSourceSyncLock({
            ddb,
            tableName,
            tenantId,
            sourceId,
            owner: sourceOwner,
          })
        }
      }

      tenantRecord.dataSources = sources
      tenantRecord.updatedAt = new Date().toISOString()
      await writeTenantRecord(ddb, tableName, tenantRecord)
      processedTenants += 1
    } finally {
      await releaseTenantSyncLock({
        ddb,
        tableName,
        tenantId,
        owner,
      })
    }
  }

  return NextResponse.json({
    pageSize: page.tenantIds.length,
    processedTenants,
    lockedSkipped,
    totalSourcesProcessed,
    totalSourcesFailed,
    totalSourcesSkippedInProgress,
    nextToken: page.nextToken,
  })
}
