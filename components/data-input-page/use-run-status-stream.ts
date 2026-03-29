import { useEffect } from "react"
import type React from "react"

export type StreamRunSummary = {
  runId?: string
  status?: string
  createdAt?: string
  updatedAt?: string
  message?: string
}

export const useRunStatusStream = (
  runId: string | undefined,
  setRunStatus: React.Dispatch<React.SetStateAction<StreamRunSummary | null>>
) => {
  useEffect(() => {
    if (!runId) return

    const stream = new EventSource(`/api/forecast/status-stream?runId=${encodeURIComponent(runId)}`)
    stream.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { run?: StreamRunSummary; error?: string }
        if (payload.error) {
          setRunStatus((prev) => ({ ...(prev || {}), message: payload.error }))
          stream.close()
          return
        }
        if (payload.run) {
          const run = payload.run
          setRunStatus((prev) => ({
            ...(prev || {}),
            ...run,
            message: prev?.message || run.message,
          }))
          const normalizedStatus = String(run.status || "").toUpperCase()
          if (normalizedStatus === "DONE" || normalizedStatus === "FAILED") {
            stream.close()
          }
        }
      } catch {
        setRunStatus((prev) => ({ ...(prev || {}), message: "status_stream_parse_error" }))
        stream.close()
      }
    }

    stream.onerror = () => {
      setRunStatus((prev) => ({ ...(prev || {}), message: prev?.message || "status_stream_disconnected" }))
      stream.close()
    }

    return () => stream.close()
  }, [runId, setRunStatus])
}
