import type { ReplenishmentRiskTier, ReplenishmentRow } from "@/lib/replenishments"

export type ReplenishmentExceptionPreset =
  | "all"
  | "critical"
  | "reorder-now"
  | "a-class"
  | "estimated"
  | "stockout"

export type ReplenishmentException = {
  severity: "critical" | "high" | "medium" | "info"
  title: string
  detail: string
  actionHref?: string
  actionLabel?: string
}

export const REPLENISHMENT_EXCEPTION_PRESETS: Array<{
  value: ReplenishmentExceptionPreset
  label: string
}> = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical only" },
  { value: "reorder-now", label: "Reorder by date set" },
  { value: "a-class", label: "A-class exceptions" },
  { value: "estimated", label: "Estimated inventory only" },
  { value: "stockout", label: "Stockout dated" },
]

const riskSeverityMap: Record<ReplenishmentRiskTier, ReplenishmentException["severity"]> = {
  Critical: "critical",
  High: "high",
  Medium: "medium",
  Healthy: "info",
}

export const matchesReplenishmentPreset = (
  row: ReplenishmentRow,
  preset: ReplenishmentExceptionPreset
) => {
  if (preset === "all") return true
  if (preset === "critical") return row.risk === "Critical"
  if (preset === "reorder-now") return Boolean(row.reorderByDate)
  if (preset === "a-class") return row.abcClass === "A"
  if (preset === "estimated") return row.onHandSource === "estimated"
  if (preset === "stockout") return Boolean(row.predictedStockoutDate)
  return true
}

export const buildReplenishmentExceptionDetail = (row: ReplenishmentRow) => {
  const timing = [
    row.predictedStockoutDate ? `stockout ${row.predictedStockoutDate}` : null,
    row.reorderByDate ? `reorder by ${row.reorderByDate}` : null,
  ]
    .filter(Boolean)
    .join(", ")

  const cover = `${row.daysOfCover.toFixed(1)} days cover`
  const inventoryNote = row.onHandSource === "estimated" ? " Estimated inventory basis." : ""

  if (timing) {
    return `${row.risk} replenishment risk, ${cover}, ${timing}. ${row.reason}${inventoryNote}`
  }

  return `${row.risk} replenishment risk, ${cover}. ${row.reason}${inventoryNote}`
}

export const buildReplenishmentException = (
  row: ReplenishmentRow,
  actionHref = "/replenishments",
  actionLabel = "Open Replenishments"
): ReplenishmentException => ({
  severity: riskSeverityMap[row.risk],
  title: `${row.sku} · ${row.store}`,
  detail: buildReplenishmentExceptionDetail(row),
  actionHref,
  actionLabel,
})
