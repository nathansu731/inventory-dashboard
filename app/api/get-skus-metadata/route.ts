/*
* To be used in /forecasts/forecasting-summary page
*
* const res = await fetch("/api/get-skus-metadata")
*
* */
export async function GET() {
  const { appsyncRequest } = await import("@/lib/appsync")
  const { getValidIdToken } = await import("@/lib/server-auth")
  const { NextResponse } = await import("next/server")

  const { idToken, cookiesToSet } = await getValidIdToken()
  if (!idToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const query = `
    query GetSKUsMetadata {
      getSKUsMetadata {
        status
        result
      }
    }
  `

  const json = await appsyncRequest(idToken, query)
  const response = NextResponse.json(json.data.getSKUsMetadata)
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  return response
}

/*
* "getSKUsMetadata": {
      "result": "{
      * \"SKU_01\":{\"store\":\"Brisbane\",\"skuDesc\":\"Description for SKU_01\",\"forecastMethod\":\"ETS\",\"ABCclass\":\"C\",\"ABCpercentage\":8.94,\"isApproved\":true},
      * \"SKU_02\":{\"store\":\"Sydney\",\"skuDesc\":\"Description for SKU_02\",\"forecastMethod\":\"Prophet\",\"ABCclass\":\"B\",\"ABCpercentage\":20.28,\"isApproved\":true},
      * \"SKU_03\":{\"store\":\"Melbourne\",\"skuDesc\":\"Description for SKU_03\",\"forecastMethod\":\"ETS\",\"ABCclass\":\"B\",\"ABCpercentage\":21.78,\"isApproved\":true},
      * \"SKU_04\":{\"store\":\"Brisbane\",\"skuDesc\":\"Description for SKU_04\",\"forecastMethod\":\"ARIMA\",\"ABCclass\":\"A\",\"ABCpercentage\":73.28,\"isApproved\":false},
      * \"SKU_05\":{\"store\":\"Melbourne\",\"skuDesc\":\"Description for SKU_05\",\"forecastMethod\":\"Prophet\",\"ABCclass\":\"A\",\"ABCpercentage\":79.94,\"isApproved\":false},\"SKU_06\":{\"store\":\"Sydney\",\"skuDesc\":\"Description for SKU_06\",\"forecastMethod\":\"ARIMA\",\"ABCclass\":\"B\",\"ABCpercentage\":17.89,\"isApproved\":false},\"SKU_07\":{\"store\":\"Sydney\",\"skuDesc\":\"Description for SKU_07\",\"forecastMethod\":\"ARIMA\",\"ABCclass\":\"C\",\"ABCpercentage\":8.98,\"isApproved\":true},\"SKU_08\":{\"store\":\"Brisbane\",\"skuDesc\":\"Description for SKU_08\",\"forecastMethod\":\"ETS\",\"ABCclass\":\"C\",\"ABCpercentage\":6.59,\"isApproved\":true},\"SKU_09\":{\"store\":\"Melbourne\",\"skuDesc\":\"Description for SKU_09\",\"forecastMethod\":\"ETS\",\"ABCclass\":\"C\",\"ABCpercentage\":5.69,\"isApproved\":true},\"SKU_10\":{\"store\":\"Melbourne\",\"skuDesc\":\"Description for SKU_10\",\"forecastMethod\":\"Prophet\",\"ABCclass\":\"C\",\"ABCpercentage\":5.23,\"isApproved\":true}}",
      "status": "success"
    },
 */
