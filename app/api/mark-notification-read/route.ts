export async function POST(request: Request) {
  const { appsyncRequest } = await import("@/lib/appsync")
  const { getValidIdToken } = await import("@/lib/server-auth")
  const { NextResponse } = await import("next/server")

  const { idToken, cookiesToSet } = await getValidIdToken()
  if (!idToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const payload = (await request.json().catch(() => null)) as { notificationId?: string } | null
  if (!payload?.notificationId) {
    return NextResponse.json({ error: "missing_notification_id" }, { status: 400 })
  }

  const query = `
    mutation MarkNotificationRead($notificationId: ID!) {
      markNotificationRead(notificationId: $notificationId) {
        notificationId
        runId
        tenantId
        status
        createdAt
        updatedAt
        read
        summary
      }
    }
  `

  const json = await appsyncRequest(idToken, query, { notificationId: payload.notificationId })
  const response = NextResponse.json(json.data.markNotificationRead)
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  return response
}
