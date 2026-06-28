export async function GET() {
  const { appsyncRequest } = await import("@/lib/appsync")
  const { getAuthenticatedApiContext } = await import("@/lib/server-auth")
  const { NextResponse } = await import("next/server")

  const { idToken, cookiesToSet, errorResponse } = await getAuthenticatedApiContext()
  if (errorResponse || !idToken) return errorResponse!

  const query = `
    query GetForecastApprovals {
      getForecastApprovals {
        status
        result
      }
    }
  `

  const json = await appsyncRequest(idToken, query)
  const response = NextResponse.json(json.data.getForecastApprovals)
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  return response
}

export async function POST(request: Request) {
  const { appsyncRequest } = await import("@/lib/appsync")
  const { getAuthenticatedApiContext } = await import("@/lib/server-auth")
  const { NextResponse } = await import("next/server")

  const { idToken, cookiesToSet, errorResponse } = await getAuthenticatedApiContext()
  if (errorResponse || !idToken) return errorResponse!

  const payload = (await request.json().catch(() => null)) as {
    sku?: string
    store?: string
    approved?: boolean
  } | null

  const query = `
    mutation SetForecastApproval($input: ForecastApprovalInput!) {
      setForecastApproval(input: $input) {
        status
        result
      }
    }
  `

  const json = await appsyncRequest(idToken, query, { input: payload ?? {} })
  const response = NextResponse.json(json.data.setForecastApproval)
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  return response
}
