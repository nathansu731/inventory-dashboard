export async function GET(request: Request) {
  const { appsyncRequest } = await import("@/lib/appsync")
  const { buildInventorySeriesKey, loadInventorySnapshot } = await import("@/lib/inventory-snapshot")
  const { buildMergedDailyForecasts } = await import("@/lib/merged-forecast-views")
  const { buildReplenishmentRows } = await import("@/lib/replenishments")
  const { getAuthenticatedApiContext } = await import("@/lib/server-auth")
  const { NextResponse } = await import("next/server")

  const { idToken, cookiesToSet, errorResponse, tokenCtx } = await getAuthenticatedApiContext()
  if (errorResponse || !idToken || !tokenCtx) return errorResponse!

  const url = new URL(request.url)
  const rawHorizon = Number(url.searchParams.get("horizon") ?? 30)
  const horizonDays = rawHorizon === 14 || rawHorizon === 60 ? rawHorizon : 30
  const runId = url.searchParams.get("runId")

  const mergedQuery = `
    query GetMergedAndMetadata($runId: ID) {
      getMergedSkuForecastValues(runId: $runId) {
        status
        result
      }
      getSKUsMetadata(runId: $runId) {
        status
        result
      }
    }
  `

  const mergedJson = await appsyncRequest(idToken, mergedQuery, { runId })
  const mergedPayload = mergedJson?.data?.getMergedSkuForecastValues
  const metadataPayload = mergedJson?.data?.getSKUsMetadata
  const mergedResult =
    typeof mergedPayload?.result === "string" ? JSON.parse(mergedPayload.result) : mergedPayload?.result
  const metadataResult =
    typeof metadataPayload?.result === "string" ? JSON.parse(metadataPayload.result) : metadataPayload?.result

  const dailyRows = buildMergedDailyForecasts({ items: mergedResult?.items ?? [] }, horizonDays)
  const inventorySnapshot = await loadInventorySnapshot(tokenCtx.tenantId)
  const inventoryBySeries = inventorySnapshot.rows.reduce<Record<string, { onHand: number; asOfDate?: string | null }>>((acc, row) => {
    acc[buildInventorySeriesKey(row.sku, row.store)] = { onHand: row.onHand, asOfDate: row.asOfDate }
    return acc
  }, {})
  const replenishmentRows = buildReplenishmentRows(
    (metadataResult ?? {}) as Record<string, { store?: string; skuDesc?: string; ABCclass?: string; ABCpercentage?: number }>,
    dailyRows,
    horizonDays,
    inventoryBySeries
  )
  const providedCount = replenishmentRows.filter((row) => row.onHandSource === "provided").length

  const response = NextResponse.json({
    status: mergedPayload?.status ?? "success",
    result: {
      generatedAt: new Date().toISOString(),
      horizonDays,
      inventoryCoverage: {
        totalSeries: replenishmentRows.length,
        providedCount,
        estimatedCount: Math.max(0, replenishmentRows.length - providedCount),
        snapshotUploadedAt: inventorySnapshot.metadata?.uploadedAt || null,
        snapshotAsOfDate: inventorySnapshot.metadata?.asOfDate || null,
        sourceType: inventorySnapshot.metadata?.sourceType || null,
      },
      items: replenishmentRows.map((row) => ({
        seriesKey: row.seriesKey,
        sku: row.sku,
        store: row.store,
        skuDesc: row.skuDesc,
        abcClass: row.abcClass,
        avgDailyDemand: row.avgDailyDemand,
        horizonDemand: row.horizonDemand,
        onHand: row.estimatedOnHand,
        onHandSource: row.onHandSource ?? "estimated",
        daysOfCover: row.daysOfCover,
        predictedStockoutDate: row.predictedStockoutDate,
        reorderByDate: row.reorderByDate,
        recommendedReorderQty: row.recommendedReorderQty,
        leadTimeDays: row.leadTimeDays,
        safetyStockDays: row.safetyStockDays,
        risk: row.risk,
        reason: row.reason,
      })),
    },
  })
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  return response
}
