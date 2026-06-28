export async function GET() {
  const { appsyncRequest } = await import("@/lib/appsync")
  const { getAuthenticatedApiContext } = await import("@/lib/server-auth")
  const { NextResponse } = await import("next/server")

  const { idToken, cookiesToSet, errorResponse } = await getAuthenticatedApiContext()
  if (errorResponse || !idToken) return errorResponse!

  const query = `
    query GetTenantSettings {
      getTenantSettings {
        tenantId
        model
        mode
        seasonality
        dateFormat
        skuColumnName
        storeColumnName
        targetVariable
        onHandColumnName
        priceColumnName
        holidayColumnName
        promotionColumnName
        openStatusColumnName
        forecastHorizon
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
  const { getAuthenticatedApiContext } = await import("@/lib/server-auth")
  const { NextResponse } = await import("next/server")

  const { idToken, cookiesToSet, errorResponse } = await getAuthenticatedApiContext()
  if (errorResponse || !idToken) return errorResponse!

  const payload = (await request.json().catch(() => null)) as {
    model?: string
    mode?: string
    seasonality?: string
    dateFormat?: string
    skuColumnName?: string
    storeColumnName?: string
    targetVariable?: string
    onHandColumnName?: string
    priceColumnName?: string
    holidayColumnName?: string
    promotionColumnName?: string
    openStatusColumnName?: string
    forecastHorizon?: number
  } | null

  const query = `
    mutation SetTenantSettings($input: TenantSettingsInput!) {
      setTenantSettings(input: $input) {
        tenantId
        model
        mode
        seasonality
        dateFormat
        skuColumnName
        storeColumnName
        targetVariable
        onHandColumnName
        priceColumnName
        holidayColumnName
        promotionColumnName
        openStatusColumnName
        forecastHorizon
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
