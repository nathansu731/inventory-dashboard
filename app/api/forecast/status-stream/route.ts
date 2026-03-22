import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const runId = searchParams.get("runId") || ""
  if (!runId) {
    return NextResponse.json({ error: "missing_run_id" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const idToken = cookieStore.get("id_token")?.value || ""
  if (!idToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      let closed = false
      let lastStatus = ""

      const push = (payload: Record<string, unknown>) => {
        if (closed) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      const close = () => {
        if (closed) return
        closed = true
        controller.close()
      }

      const loop = async () => {
        while (!closed) {
          try {
            const { appsyncRequest } = await import("@/lib/appsync")
            const query = `
              query GetForecastRun($runId: ID!) {
                getForecastRun(runId: $runId) {
                  runId
                  tenantId
                  snapshotId
                  status
                  createdAt
                  updatedAt
                  s3OutputPrefix
                  summary
                }
              }
            `
            const json = await appsyncRequest(idToken, query, { runId })
            const run = json?.data?.getForecastRun
            const status = typeof run?.status === "string" ? run.status : ""

            if (status && status !== lastStatus) {
              lastStatus = status
              push({ run })
            }

            if (status === "DONE" || status === "FAILED") {
              close()
              return
            }
          } catch (err) {
            push({ error: err instanceof Error ? err.message : "stream_error" })
            close()
            return
          }

          await sleep(3000)
        }
      }

      request.signal.addEventListener("abort", () => {
        close()
      })

      void loop()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
