/*
* To be used in /overview page
*
* const res = await fetch("/api/get-monthly-totals")

*
* */
export async function GET() {
  const query = `
    query GetMonthlyTotals {
      getMonthlyTotals {
        status
        result
      }
    }
  `

  const response = await fetch(process.env.APPSYNC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.APPSYNC_API_KEY
    },
    body: JSON.stringify({ query })
  })

  const json = await response.json()

  return Response.json(json.data.getMonthlyTotals)
}

/*
* Response
*
*   "getMonthlyTotals": {
      "result": "{\"totalRevenue\":{\"value\":352948.24,\"variance\":-0.244,\"status\":\"negative\"},
      * \"newCustomers\":{\"value\":15824.54,\"variance\":0.055,\"status\":\"positive\"},
      * \"activeAccounts\":{\"value\":251153.22,\"variance\":-0.288,\"status\":\"negative\"},
      * \"growthRate\":{\"value\":290601.38,\"variance\":-0.201,\"status\":\"negative\"},\
      * "operatingExpenses\":{\"value\":185870,\"variance\":-0.092,\"status\":\"negative\"},\
      * "netIncome\":{\"value\":163870.39,\"variance\":0.004,\"status\":\"stable\"},
      * \"grossMargin\":{\"value\":133776.72,\"variance\":-0.02,\"status\":\"stable\"},\
      * "ebitda\":{\"value\":221066.69,\"variance\":-0.289,\"status\":\"negative\"},
      * \"cashFlow\":{\"value\":86448.75,\"variance\":0.087,\"status\":\"positive\"},
      * \"marketShare\":{\"value\":387426.31,\"variance\":-0.233,\"status\":\"negative\"},
      * \"customerAcquisition\":{\"value\":178429.16,\"variance\":-0.032,\"status\":\"stable\"}}",
      "status": "success"
    },

*
* */