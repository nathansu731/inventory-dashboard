export async function GET() {
  const { appsyncRequest } = await import("@/lib/appsync")
  const { getValidIdToken } = await import("@/lib/server-auth")
  const { NextResponse } = await import("next/server")

  const { idToken, cookiesToSet } = await getValidIdToken()
  if (!idToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const query = `
    query GetTenantSettings {
      getTenantSettings {
        tenantId
        model
        mode
        seasonality
        dateFormat
        targetVariable
        priceColumnName
        updatedAt
      }
    }
  `
  const json = await appsyncRequest(idToken, query)
  const response = NextResponse.json(json.data.getTenantSettings)
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  return response
}

export async function POST(request: Request) {
  const { appsyncRequest } = await import("@/lib/appsync")
  const { getValidIdToken } = await import("@/lib/server-auth")
  const { NextResponse } = await import("next/server")

  const { idToken, cookiesToSet } = await getValidIdToken()
  if (!idToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const payload = (await request.json().catch(() => null)) as {
    model?: string
    mode?: string
    seasonality?: string
    dateFormat?: string
    targetVariable?: string
    priceColumnName?: string
  } | null

  const query = `
    mutation SetTenantSettings($input: TenantSettingsInput!) {
      setTenantSettings(input: $input) {
        tenantId
        model
        mode
        seasonality
        dateFormat
        targetVariable
        priceColumnName
        updatedAt
      }
    }
  `
  const json = await appsyncRequest(idToken, query, { input: payload ?? {} })
  const response = NextResponse.json(json.data.setTenantSettings)
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  return response
}
