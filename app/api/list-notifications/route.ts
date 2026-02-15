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
  const nextToken = searchParams.get("nextToken")

  const query = `
    query ListNotifications($limit: Int, $nextToken: String) {
      listNotifications(limit: $limit, nextToken: $nextToken) {
        items {
          notificationId
          runId
          tenantId
          status
          createdAt
          updatedAt
          read
          summary
        }
        nextToken
      }
    }
  `

  const json = await appsyncRequest(idToken, query, { limit, nextToken })
  const response = NextResponse.json(json.data.listNotifications)
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  return response
}
