export async function GET(request: Request) {
  const { appsyncRequest } = await import("@/lib/appsync")
  const { getAuthenticatedApiContext } = await import("@/lib/server-auth")
  const { NextResponse } = await import("next/server")

  const { idToken, cookiesToSet, errorResponse } = await getAuthenticatedApiContext()
  if (errorResponse || !idToken) return errorResponse!

  const { searchParams } = new URL(request.url)
  const runId = searchParams.get("runId")

  const query = `
    query GetDailyForecasts($runId: ID) {
      getDailyForecasts(runId: $runId) {
        status
        result
      }
    }
  `

  const json = await appsyncRequest(idToken, query, { runId })
  const response = NextResponse.json(json.data.getDailyForecasts)
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  return response
}
