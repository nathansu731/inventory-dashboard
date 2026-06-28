const RUN_STATUS_LABELS: Record<string, string> = {
  DONE: "Completed",
  FAILED: "Failed",
  RUNNING: "Running",
  PENDING: "Pending",
  QUEUED: "Queued",
}

const JOB_STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  failed: "Failed",
  "in-progress": "In Progress",
  pending: "Pending",
}

const toTitleCaseWords = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")

const normalizeLabel = (raw: string) => {
  const cleaned = raw.trim().replace(/[_-]+/g, " ")
  if (!cleaned) return "Unknown"
  return toTitleCaseWords(cleaned)
}

export const formatRunStatusLabel = (status?: string | null) => {
  const normalized = String(status || "").trim()
  if (!normalized) return "Unknown"
  const upper = normalized.toUpperCase()
  return RUN_STATUS_LABELS[upper] ?? normalizeLabel(normalized)
}

export const formatJobStatusLabel = (status?: string | null) => {
  const normalized = String(status || "").trim()
  if (!normalized) return "Unknown"
  return JOB_STATUS_LABELS[normalized] ?? normalizeLabel(normalized)
}

export const parseRunSummary = (summary: unknown): Record<string, unknown> | null => {
  if (!summary) return null
  if (typeof summary === "string") {
    try {
      const parsed = JSON.parse(summary) as unknown
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null
    } catch {
      return null
    }
  }
  if (typeof summary === "object") {
    return summary as Record<string, unknown>
  }
  return null
}

const extractString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (value && typeof value === "object") {
    const maybeMessage = (value as Record<string, unknown>).message
    if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage.trim()
  }
  return null
}

export const extractFailureReason = (summary: unknown): string | null => {
  const parsed = parseRunSummary(summary)
  if (!parsed) return null
  const candidates = ["reason", "error", "message", "detail", "details"]
  for (const key of candidates) {
    const text = extractString(parsed[key])
    if (text) return text
  }
  return null
}
