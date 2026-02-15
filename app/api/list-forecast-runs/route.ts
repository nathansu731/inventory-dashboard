export async function GET(request: Request) {
  const { appsyncRequest } = await import("@/lib/appsync")
  const { getValidIdToken } = await import("@/lib/server-auth")
  const { NextResponse } = await import("next/server")

  const { idToken, cookiesToSet } = await getValidIdToken()
  if (!idToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get("limit") ?? "10")

  const query = `
    query ListForecastRuns($limit: Int) {
      listForecastRuns(limit: $limit) {
        items {
          runId
          tenantId
          snapshotId
          status
          createdAt
          updatedAt
          s3OutputPrefix
          summary
        }
        nextToken
      }
    }
  `

  const json = await appsyncRequest(idToken, query, { limit })
  const response = NextResponse.json(json.data.listForecastRuns)
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  return response
}
