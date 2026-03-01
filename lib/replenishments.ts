type SkuMetadata = {
  store?: string
  skuDesc?: string
  ABCclass?: string
  ABCpercentage?: number
}

type DailyForecast = {
  sku: string
  date: string
  forecast: number
}

export type ReplenishmentRiskTier = "Critical" | "High" | "Medium" | "Healthy"

export type ReplenishmentRow = {
  sku: string
  skuDesc: string
  store: string
  abcClass: string
  avgDailyDemand: number
  horizonDemand: number
  estimatedOnHand: number
  onHandSource?: "provided" | "estimated" | "unknown"
  daysOfCover: number
  predictedStockoutDate: string | null
  reorderByDate: string | null
  recommendedReorderQty: number
  leadTimeDays: number
  safetyStockDays: number
  risk: ReplenishmentRiskTier
}

type RiskSummary = {
  totalSkus: number
  critical: number
  high: number
  medium: number
  healthy: number
  atRisk: number
  stockoutIn7Days: number
}

const LEAD_TIME_BY_CLASS: Record<string, number> = {
  A: 7,
  B: 14,
  C: 21,
}

const SAFETY_DAYS_BY_CLASS: Record<string, number> = {
  A: 4,
  B: 6,
  C: 8,
}

const COVER_DAYS_PROXY_BY_CLASS: Record<string, number> = {
  A: 8,
  B: 14,
  C: 22,
}

const riskScore = (risk: ReplenishmentRiskTier) => {
  if (risk === "Critical") return 4
  if (risk === "High") return 3
  if (risk === "Medium") return 2
  return 1
}

const normalizeClass = (abcClass?: string) => {
  const value = (abcClass || "C").toUpperCase()
  return value === "A" || value === "B" || value === "C" ? value : "C"
}

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10)

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const parseDate = (value: string) => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const computeAvg = (values: number[]) => {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const computeStdDev = (values: number[]) => {
  if (values.length < 2) return 0
  const mean = computeAvg(values)
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

const computeRiskTier = (daysOfCover: number, leadTimeDays: number, safetyStockDays: number): ReplenishmentRiskTier => {
  if (daysOfCover <= Math.max(3, Math.ceil(leadTimeDays * 0.6))) return "Critical"
  if (daysOfCover <= leadTimeDays) return "High"
  if (daysOfCover <= leadTimeDays + safetyStockDays) return "Medium"
  return "Healthy"
}

export const buildReplenishmentRows = (
  metadata: Record<string, SkuMetadata>,
  dailyForecasts: DailyForecast[],
  horizonDays = 30
): ReplenishmentRow[] => {
  const today = new Date()
  const tomorrow = addDays(today, 1)
  const horizonEnd = addDays(tomorrow, Math.max(1, horizonDays) - 1)

  const rows: ReplenishmentRow[] = Object.entries(metadata).map(([sku, meta]) => {
    const abcClass = normalizeClass(meta.ABCclass)
    const leadTimeDays = LEAD_TIME_BY_CLASS[abcClass] ?? LEAD_TIME_BY_CLASS.C
    const safetyStockDays = SAFETY_DAYS_BY_CLASS[abcClass] ?? SAFETY_DAYS_BY_CLASS.C
    const baseCoverDays = COVER_DAYS_PROXY_BY_CLASS[abcClass] ?? COVER_DAYS_PROXY_BY_CLASS.C

    const series = dailyForecasts
      .filter((entry) => entry.sku === sku)
      .filter((entry) => {
        const date = parseDate(entry.date)
        return Boolean(date && date >= tomorrow && date <= horizonEnd)
      })
      .sort((a, b) => a.date.localeCompare(b.date))

    const demandSeries = series.map((entry) => Math.max(0, Number(entry.forecast ?? 0)))
    const avgDailyDemand = computeAvg(demandSeries)
    const horizonDemand = demandSeries.reduce((sum, value) => sum + value, 0)
    const variability = avgDailyDemand > 0 ? computeStdDev(demandSeries) / avgDailyDemand : 0

    const coverAdjustment = variability > 0.7 ? -3 : variability > 0.4 ? -2 : variability > 0.25 ? -1 : 1
    const estimatedCoverDays = Math.max(2, baseCoverDays + coverAdjustment)
    const estimatedOnHand = Math.round(avgDailyDemand * estimatedCoverDays)
    const daysOfCover = avgDailyDemand > 0 ? estimatedOnHand / avgDailyDemand : 999

    const risk = computeRiskTier(daysOfCover, leadTimeDays, safetyStockDays)
    const predictedStockoutDate =
      avgDailyDemand > 0 ? toIsoDate(addDays(today, Math.max(1, Math.floor(daysOfCover)))) : null
    const reorderByDate =
      predictedStockoutDate && risk !== "Healthy"
        ? toIsoDate(addDays(parseDate(predictedStockoutDate) || today, -leadTimeDays))
        : null
    const recommendedReorderQty = Math.max(
      0,
      Math.ceil((leadTimeDays + safetyStockDays) * avgDailyDemand - estimatedOnHand)
    )

    return {
      sku,
      skuDesc: meta.skuDesc || "N/A",
      store: meta.store || "Unknown",
      abcClass,
      avgDailyDemand: Number(avgDailyDemand.toFixed(2)),
      horizonDemand: Math.round(horizonDemand),
      estimatedOnHand,
      onHandSource: "estimated",
      daysOfCover: Number(daysOfCover.toFixed(1)),
      predictedStockoutDate,
      reorderByDate,
      recommendedReorderQty,
      leadTimeDays,
      safetyStockDays,
      risk,
    }
  })

  return rows.sort((a, b) => {
    const byRisk = riskScore(b.risk) - riskScore(a.risk)
    if (byRisk !== 0) return byRisk
    if (!a.predictedStockoutDate && !b.predictedStockoutDate) return a.sku.localeCompare(b.sku)
    if (!a.predictedStockoutDate) return 1
    if (!b.predictedStockoutDate) return -1
    return a.predictedStockoutDate.localeCompare(b.predictedStockoutDate)
  })
}

export const summarizeReplenishment = (rows: ReplenishmentRow[]): RiskSummary => {
  const summary: RiskSummary = {
    totalSkus: rows.length,
    critical: 0,
    high: 0,
    medium: 0,
    healthy: 0,
    atRisk: 0,
    stockoutIn7Days: 0,
  }

  const today = new Date()
  const threshold = toIsoDate(addDays(today, 7))

  for (const row of rows) {
    if (row.risk === "Critical") summary.critical += 1
    if (row.risk === "High") summary.high += 1
    if (row.risk === "Medium") summary.medium += 1
    if (row.risk === "Healthy") summary.healthy += 1
    if (row.risk !== "Healthy") summary.atRisk += 1
    if (row.predictedStockoutDate && row.predictedStockoutDate <= threshold) {
      summary.stockoutIn7Days += 1
    }
  }

  return summary
}
