export type ForecastRunSummary = {
  totalSkus?: number
  totalSeries?: number
  rows?: number
  dateStart?: string
  dateEnd?: string
  runConfig?: {
    executedModel?: string
    executedMode?: string
    detectedFrequency?: string
  }
  validation?: {
    selectedModel?: {
      model?: string
      mode?: string
      metrics?: {
        smape?: number
        mae?: number
        rmse?: number
      }
    }
  }
}

export type ForecastRunItem = {
  runId: string
  tenantId: string
  snapshotId?: string | null
  parentRunId?: string | null
  isScenario?: boolean
  adjustmentsKey?: string | null
  scenarioLabel?: string | null
  editedAt?: string | null
  editedCellCount?: number | null
  status: string
  createdAt?: string
  updatedAt?: string
  s3OutputPrefix?: string | null
  summary?: string | Record<string, unknown> | null
}

export type ForecastRunOption = ForecastRunItem & {
  parsedSummary: ForecastRunSummary | null
}

export const parseForecastRunSummary = (summary: ForecastRunItem["summary"]): ForecastRunSummary | null => {
  if (!summary) return null
  if (typeof summary === "string") {
    try {
      return JSON.parse(summary) as ForecastRunSummary
    } catch {
      return null
    }
  }
  return summary as ForecastRunSummary
}

export const buildRunScopedUrl = (url: string, runId?: string | null) => {
  if (!runId) return url
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}runId=${encodeURIComponent(runId)}`
}

export const fetchForecastRuns = async (limit = 25): Promise<ForecastRunOption[]> => {
  const res = await fetch(`/api/list-forecast-runs?limit=${limit}`, { cache: "no-store" })
  if (!res.ok) return []
  const json = await res.json()
  const items = (json?.items ?? []) as ForecastRunItem[]
  return items.map((item) => ({
    ...item,
    parsedSummary: parseForecastRunSummary(item.summary),
  }))
}

export const formatRunTimestamp = (value?: string) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("en-AU", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export const buildRunOptionLabel = (run: ForecastRunOption) => {
  const model =
    run.parsedSummary?.runConfig?.executedModel ||
    run.parsedSummary?.validation?.selectedModel?.model ||
    "model"
  const scenarioTag = run.isScenario ? ` · ${run.scenarioLabel || "SCENARIO"}` : ""
  return `${run.runId} · ${String(model).toUpperCase()}${scenarioTag} · ${formatRunTimestamp(run.createdAt)}`
}
