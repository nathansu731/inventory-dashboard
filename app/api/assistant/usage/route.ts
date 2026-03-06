import { NextResponse } from "next/server"
import { appsyncRequest } from "@/lib/appsync"
import { getValidIdToken } from "@/lib/server-auth"

export async function GET() {
  const { idToken, cookiesToSet } = await getValidIdToken()
  if (!idToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const query = `
    query GetAssistantUsage {
      getAssistantUsage {
        monthKey
        requestsUsed
        requestsLimit
        tokensUsed
        tokensLimit
        rateMinuteLimit
        rateHourLimit
      }
    }
  `

  try {
    const json = await appsyncRequest(idToken, query)
    const response = NextResponse.json(json.data.getAssistantUsage)
    for (const cookie of cookiesToSet) {
      response.cookies.set(cookie.name, cookie.value, cookie.options)
    }
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : "assistant_usage_failed"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
