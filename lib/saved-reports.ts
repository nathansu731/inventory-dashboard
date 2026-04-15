export type SavedReportCriteria = {
  searchText: string
  status: string
  model: string
  dateFrom: string
  dateTo: string
}

export type SavedReportSnapshot = {
  runCount: number
  doneCount: number
  failedCount: number
  averageSmape: number | null
  averageAccuracy: number | null
  averageTotalSkus: number | null
  periodStart: string | null
  periodEnd: string | null
  generatedAt: string
}

export type SavedReportDefinition = {
  id: string
  name: string
  criteria: SavedReportCriteria
  snapshot?: SavedReportSnapshot | null
  createdAt: string
  updatedAt: string
}

export const defaultSavedReportCriteria = (): SavedReportCriteria => ({
  searchText: "",
  status: "all",
  model: "all",
  dateFrom: "",
  dateTo: "",
})

const parseCriteria = (value: unknown): SavedReportCriteria => {
  const input = typeof value === "object" && value ? (value as Record<string, unknown>) : {}
  return {
    searchText: typeof input.searchText === "string" ? input.searchText : "",
    status: typeof input.status === "string" ? input.status : "all",
    model: typeof input.model === "string" ? input.model : "all",
    dateFrom: typeof input.dateFrom === "string" ? input.dateFrom : "",
    dateTo: typeof input.dateTo === "string" ? input.dateTo : "",
  }
}

const parseNumber = (value: unknown): number | null => {
  if (typeof value !== "number" || Number.isNaN(value)) return null
  return value
}

const parseSnapshot = (value: unknown): SavedReportSnapshot | null => {
  const input = typeof value === "object" && value ? (value as Record<string, unknown>) : null
  if (!input) return null

  const runCount = typeof input.runCount === "number" && Number.isFinite(input.runCount) ? Math.max(0, Math.floor(input.runCount)) : 0
  const doneCount = typeof input.doneCount === "number" && Number.isFinite(input.doneCount) ? Math.max(0, Math.floor(input.doneCount)) : 0
  const failedCount = typeof input.failedCount === "number" && Number.isFinite(input.failedCount) ? Math.max(0, Math.floor(input.failedCount)) : 0

  return {
    runCount,
    doneCount,
    failedCount,
    averageSmape: parseNumber(input.averageSmape),
    averageAccuracy: parseNumber(input.averageAccuracy),
    averageTotalSkus: parseNumber(input.averageTotalSkus),
    periodStart: typeof input.periodStart === "string" ? input.periodStart : null,
    periodEnd: typeof input.periodEnd === "string" ? input.periodEnd : null,
    generatedAt: typeof input.generatedAt === "string" ? input.generatedAt : "",
  }
}

const parseDefinition = (value: unknown): SavedReportDefinition | null => {
  const input = typeof value === "object" && value ? (value as Record<string, unknown>) : null
  if (!input) return null
  if (typeof input.id !== "string" || typeof input.name !== "string") return null

  return {
    id: input.id,
    name: input.name,
    criteria: parseCriteria(input.criteria),
    snapshot: parseSnapshot(input.snapshot),
    createdAt: typeof input.createdAt === "string" ? input.createdAt : "",
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : "",
  }
}

const readErrorMessage = async (res: Response) => {
  const fallback = `request_failed_${res.status}`
  try {
    const payload = (await res.json()) as { error?: string }
    return payload?.error || fallback
  } catch {
    return fallback
  }
}

export const readSavedReports = async (nextToken?: string): Promise<{ items: SavedReportDefinition[]; nextToken: string | null }> => {
  const qs = new URLSearchParams()
  qs.set("limit", "100")
  if (nextToken) qs.set("nextToken", nextToken)

  const res = await fetch(`/api/saved-reports?${qs.toString()}`, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  const payload = (await res.json()) as { items?: unknown[]; nextToken?: string | null }
  const items = Array.isArray(payload?.items)
    ? payload.items.map((item) => parseDefinition(item)).filter((item): item is SavedReportDefinition => Boolean(item))
    : []

  return {
    items,
    nextToken: typeof payload?.nextToken === "string" ? payload.nextToken : null,
  }
}

export const readAllSavedReports = async (): Promise<SavedReportDefinition[]> => {
  let token: string | null = null
  const all: SavedReportDefinition[] = []

  do {
    const page = await readSavedReports(token ?? undefined)
    all.push(...page.items)
    token = page.nextToken
  } while (token)

  return all.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export const upsertSavedReport = async (
  input: Omit<SavedReportDefinition, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<SavedReportDefinition> => {
  const res = await fetch("/api/saved-reports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  const payload = await res.json()
  const parsed = parseDefinition(payload)
  if (!parsed) {
    throw new Error("invalid_saved_report_response")
  }

  return parsed
}

export const deleteSavedReports = async (ids: string[]): Promise<void> => {
  await Promise.all(
    ids.map(async (id) => {
      const res = await fetch(`/api/saved-reports/${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        throw new Error(await readErrorMessage(res))
      }
    }),
  )
}

export const findSavedReport = async (id: string): Promise<SavedReportDefinition | null> => {
  const res = await fetch(`/api/saved-reports/${encodeURIComponent(id)}`, { cache: "no-store" })
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  const payload = await res.json()
  return parseDefinition(payload)
}
