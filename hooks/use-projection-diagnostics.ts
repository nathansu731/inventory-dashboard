"use client"

import { useEffect, useState } from "react"

type ProjectionDiagnostics = {
  projection?: {
    generatedAt?: string | null
    projectionVersion?: string | null
    updatedByRunId?: string | null
    itemCount?: number
    frequency?: string | null
  }
  latestRun?: {
    runId?: string
    status?: string
    createdAt?: string
    updatedAt?: string
  } | null
}

export const useProjectionDiagnostics = () => {
  const [data, setData] = useState<ProjectionDiagnostics | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch("/api/merged-projection-diagnostics", { cache: "no-store" })
        if (!res.ok) return
        const json = (await res.json()) as ProjectionDiagnostics
        if (!cancelled) setData(json)
      } catch {
        // best-effort only
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return data
}

