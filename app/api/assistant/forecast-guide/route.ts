import { NextResponse } from "next/server"
import { appsyncRequest } from "@/lib/appsync"
import { getAuthenticatedApiContext } from "@/lib/server-auth"

export async function POST(request: Request) {
  const { idToken, cookiesToSet, errorResponse } = await getAuthenticatedApiContext()
  if (errorResponse || !idToken) return errorResponse!

  const payload = (await request.json().catch(() => null)) as {
    command?: string
    runId?: string
    contextMode?: string
    pageId?: string
    route?: string
    selectedSku?: string
    selectedStore?: string
  } | null

  const command = String(payload?.command || "Guide me through getting my first forecast").trim()
  if (!command) {
    return NextResponse.json({ error: "missing_command" }, { status: 400 })
  }

  const query = `
    query ForecastAssistant($input: ForecastAssistantInput!) {
      forecastAssistant(input: $input) {
        status
        intent
        assistantText
        context
        checklist
        suggestedPrompts
        confidence
        evidence {
          source
          title
          detail
        }
        warnings
        usedTools
        answerVersion
        steps {
          id
          title
          description
          status
          action {
            id
            label
            route
            kind
          }
        }
      }
    }
  `

  try {
    const json = await appsyncRequest(idToken, query, {
      input: {
        command,
        runId: payload?.runId || null,
        contextMode: payload?.contextMode || "onboarding",
        pageId: payload?.pageId || null,
        route: payload?.route || null,
        selectedSku: payload?.selectedSku || null,
        selectedStore: payload?.selectedStore || null,
      },
    })

    const response = NextResponse.json(json.data.forecastAssistant)
    for (const cookie of cookiesToSet) {
      response.cookies.set(cookie.name, cookie.value, cookie.options)
    }
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : "assistant_request_failed"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
