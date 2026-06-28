const CHANGE_EVENT = "forecast-approvals-updated"

export type ApprovalMap = Record<string, boolean>

export const buildScopedApprovalKey = (sku: string, store?: string | null) => `${sku}::${store ?? ""}`

let approvalCache: ApprovalMap = {}

const emitApprovalChange = () => {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

const normalizeMap = (payload: unknown): ApprovalMap => {
  if (!payload || typeof payload !== "object") return {}
  return Object.entries(payload as Record<string, unknown>).reduce<ApprovalMap>((acc, [key, value]) => {
    acc[key] = Boolean(value)
    return acc
  }, {})
}

export const getForecastApproval = (map: ApprovalMap, sku: string, store?: string | null): boolean => {
  const scoped = buildScopedApprovalKey(sku, store)
  if (scoped in map) return Boolean(map[scoped])
  if (sku in map) return Boolean(map[sku])
  return false
}

export const listForecastApprovals = async (): Promise<ApprovalMap> => {
  const res = await fetch("/api/forecast-approvals", { cache: "no-store" })
  if (!res.ok) return approvalCache
  const payload = await res.json()
  const raw = typeof payload?.result === "string" ? JSON.parse(payload.result) : payload?.result
  approvalCache = normalizeMap(raw)
  return approvalCache
}

export const updateForecastApproval = async (sku: string, approved: boolean, store?: string | null): Promise<ApprovalMap> => {
  const res = await fetch("/api/forecast-approvals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku, store: store ?? null, approved }),
  })
  if (!res.ok) return approvalCache
  const payload = await res.json()
  const raw = typeof payload?.result === "string" ? JSON.parse(payload.result) : payload?.result
  approvalCache = normalizeMap(raw)
  emitApprovalChange()
  return approvalCache
}

export const subscribeForecastApprovalChanges = (callback: () => void) => {
  if (typeof window === "undefined") return () => {}
  const onCustom = () => callback()
  window.addEventListener(CHANGE_EVENT, onCustom)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onCustom)
  }
}
