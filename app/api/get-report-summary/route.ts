

export async function GET() {
    const query = `
    query GetReportSummary {
      getReportSummary {
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

    return Response.json(json.data.getReportSummary)
}