export async function POST() {
  const { appsyncRequest } = await import("@/lib/appsync")
  const { getAuthenticatedApiContext } = await import("@/lib/server-auth")
  const { NextResponse } = await import("next/server")

  const { idToken, cookiesToSet, errorResponse } = await getAuthenticatedApiContext()
  if (errorResponse || !idToken) return errorResponse!

  const query = `
    mutation MarkAllNotificationsRead {
      markAllNotificationsRead {
        affectedCount
      }
    }
  `

  try {
    const json = await appsyncRequest(idToken, query)
    const response = NextResponse.json(json.data.markAllNotificationsRead)
    for (const cookie of cookiesToSet) {
      response.cookies.set(cookie.name, cookie.value, cookie.options)
    }
    return response
  } catch {
    const response = NextResponse.json({ error: "mark_all_notifications_read_failed" }, { status: 500 })
    for (const cookie of cookiesToSet) {
      response.cookies.set(cookie.name, cookie.value, cookie.options)
    }
    return response
  }
}
