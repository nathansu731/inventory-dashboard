export async function GET() {
  const { appsyncRequest } = await import("@/lib/appsync")
  const { getAuthenticatedApiContext } = await import("@/lib/server-auth")
  const { NextResponse } = await import("next/server")

  const { idToken, cookiesToSet, errorResponse } = await getAuthenticatedApiContext()
  if (errorResponse || !idToken) return errorResponse!

  const query = `
    query MergedProjectionDiagnostics {
      getMergedSkuForecastValues {
        status
        result
      }
      listForecastRuns(limit: 1) {
        items {
          runId
          status
          createdAt
          updatedAt
          s3OutputPrefix
        }
        nextToken
      }
    }
  `

  const json = await appsyncRequest(idToken, query)
  const mergedPayload = json?.data?.getMergedSkuForecastValues
  const mergedResult =
    typeof mergedPayload?.result === "string" ? JSON.parse(mergedPayload.result) : mergedPayload?.result
  const latestRun = json?.data?.listForecastRuns?.items?.[0] ?? null

  const response = NextResponse.json({
    status: mergedPayload?.status ?? "unknown",
    projection: {
      generatedAt: mergedResult?.generatedAt ?? null,
      projectionVersion: mergedResult?.projectionVersion ?? null,
      updatedByRunId: mergedResult?.updatedByRunId ?? null,
      itemCount: Number(mergedResult?.itemCount ?? 0),
      frequency: mergedResult?.frequency ?? null,
    },
    latestRun,
  })

  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  return response
}
