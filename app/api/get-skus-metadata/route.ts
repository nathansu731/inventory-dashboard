/*
* To be used in /forecasts/forecasting-summary page
*
* const res = await fetch("/api/get-skus-metadata")
*
* */
export async function GET() {
  const apiUrl = process.env.APPSYNC_API_URL
  if (!apiUrl) {
    return Response.json({ error: "Missing APPSYNC_API_URL" }, { status: 500 })
  }
  const apiKey = process.env.APPSYNC_API_KEY
  if (!apiKey) {
    return Response.json({ error: "Missing APPSYNC_API_KEY" }, { status: 500 })
  }

  const query = `
    query GetSKUsMetadata {
      getSKUsMetadata {
        status
        result
      }
    }
  `

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify({ query })
  })

  const json = await response.json()

  return Response.json(json.data.getSKUsMetadata)
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
