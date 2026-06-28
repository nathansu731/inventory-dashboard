type ForecastItem = {
  sku: string
  store?: string
  periods?: string[]
  demand?: Record<string, number | null>
  forecastBaseline?: Record<string, number | null>
  lower80?: Record<string, number | null>
  upper80?: Record<string, number | null>
  lower95?: Record<string, number | null>
  upper95?: Record<string, number | null>
}

type ForecastValuesPayload = {
  items?: ForecastItem[]
}

type DailyForecastRow = {
  sku: string
  store?: string
  date: string
  forecast: number
  lower80?: number
  upper80?: number
  lower95?: number
  upper95?: number
}

type MonthlyForecasts = Record<string, Record<string, number>>

type ReportSummary = {
  totalSkus: number
  rows: number
  dateStart: string
  dateEnd: string
}

type MonthlyMetric = {
  value: number
  variance: number
  status: "positive" | "negative" | "stable"
}

type MonthlyTotals = {
  totalRevenue: MonthlyMetric
  stockoutRiskSkus: MonthlyMetric
  forecastAccuracy: MonthlyMetric
  growthRate: MonthlyMetric
}

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

const toMonthKey = (isoDate: string) => {
  const date = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  return `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${date.getUTCFullYear()}`
}

const sortIsoDates = (a: string, b: string) => a.localeCompare(b)

const sortMonthKeys = (a: string, b: string) => {
  const [ma, ya] = a.split("-").map(Number)
  const [mb, yb] = b.split("-").map(Number)
  if (!Number.isFinite(ma) || !Number.isFinite(ya) || !Number.isFinite(mb) || !Number.isFinite(yb)) return a.localeCompare(b)
  if (ya !== yb) return ya - yb
  return ma - mb
}

export const buildMergedDailyForecasts = (payload: ForecastValuesPayload, horizonDays = 30): DailyForecastRow[] => {
  const items = payload.items ?? []
  if (items.length === 0) return []

  const actualDates = new Set<string>()
  const forecastDates = new Set<string>()

  for (const item of items) {
    for (const period of item.periods ?? []) {
      if (!isIsoDate(period)) continue
      const demand = asNumber(item.demand?.[period])
      const baseline = asNumber(item.forecastBaseline?.[period])
      if (demand !== null) actualDates.add(period)
      if (baseline !== null) forecastDates.add(period)
    }
  }

  const maxActualDate = Array.from(actualDates).sort(sortIsoDates).at(-1) ?? null
  const candidateDates = Array.from(forecastDates).sort(sortIsoDates).filter((date) => (maxActualDate ? date > maxActualDate : true))
  const selectedDates = candidateDates.slice(0, horizonDays)

  const rows: DailyForecastRow[] = []
  for (const item of items) {
    for (const date of selectedDates) {
      const forecast = asNumber(item.forecastBaseline?.[date])
      if (forecast === null) continue
      rows.push({
        sku: item.sku,
        store: item.store,
        date,
        forecast,
        lower80: asNumber(item.lower80?.[date]) ?? undefined,
        upper80: asNumber(item.upper80?.[date]) ?? undefined,
        lower95: asNumber(item.lower95?.[date]) ?? undefined,
        upper95: asNumber(item.upper95?.[date]) ?? undefined,
      })
    }
  }

  return rows.sort((a, b) =>
    a.date === b.date
      ? `${a.sku}::${a.store || ""}`.localeCompare(`${b.sku}::${b.store || ""}`)
      : a.date.localeCompare(b.date)
  )
}

export const buildMergedMonthlyForecasts = (payload: ForecastValuesPayload, monthLimit = 12): MonthlyForecasts => {
  const demandByMonth: Record<string, number> = {}
  const forecastByMonth: Record<string, number> = {}
  const allMonths = new Set<string>()

  for (const item of payload.items ?? []) {
    for (const period of item.periods ?? []) {
      if (!isIsoDate(period)) continue
      const monthKey = toMonthKey(period)
      if (!monthKey) continue
      allMonths.add(monthKey)
      const demand = asNumber(item.demand?.[period])
      const forecast = asNumber(item.forecastBaseline?.[period])
      if (demand !== null) demandByMonth[monthKey] = (demandByMonth[monthKey] ?? 0) + demand
      if (forecast !== null) forecastByMonth[monthKey] = (forecastByMonth[monthKey] ?? 0) + forecast
    }
  }

  const monthKeys = Array.from(allMonths).sort(sortMonthKeys).slice(-monthLimit)
  const pick = (map: Record<string, number>) =>
    monthKeys.reduce<Record<string, number>>((acc, key) => {
      acc[key] = Number((map[key] ?? 0).toFixed(2))
      return acc
    }, {})

  const demand = pick(demandByMonth)
  const forecastBaseline = pick(forecastByMonth)
  const variance = monthKeys.reduce<Record<string, number>>((acc, key) => {
    acc[key] = Number(((forecastBaseline[key] ?? 0) - (demand[key] ?? 0)).toFixed(2))
    return acc
  }, {})
  const zeros = monthKeys.reduce<Record<string, number>>((acc, key) => {
    acc[key] = 0
    return acc
  }, {})

  return {
    demand,
    forecastBaseline,
    demandAdjustment: zeros,
    forecastAdjustment: zeros,
    previousForecasts: forecastBaseline,
    variance,
    revenue: zeros,
    budget: zeros,
  }
}

export const buildMergedReportSummary = (payload: ForecastValuesPayload): ReportSummary => {
  const skuSet = new Set<string>()
  const actualDates: string[] = []
  let rowCount = 0

  for (const item of payload.items ?? []) {
    if (item.sku) skuSet.add(item.sku)
    for (const period of item.periods ?? []) {
      if (!isIsoDate(period)) continue
      const demand = asNumber(item.demand?.[period])
      if (demand !== null) {
        actualDates.push(period)
        rowCount += 1
      }
    }
  }

  actualDates.sort(sortIsoDates)
  return {
    totalSkus: skuSet.size,
    rows: rowCount,
    dateStart: actualDates[0] ?? "",
    dateEnd: actualDates[actualDates.length - 1] ?? "",
  }
}

const statusFromVariance = (variance: number): "positive" | "negative" | "stable" => {
  if (variance > 0.001) return "positive"
  if (variance < -0.001) return "negative"
  return "stable"
}

export const buildMergedMonthlyTotals = (payload: ForecastValuesPayload): MonthlyTotals => {
  const monthly = buildMergedMonthlyForecasts(payload, 12)
  const monthKeys = Object.keys(monthly.demand ?? {}).sort(sortMonthKeys)
  const latestMonth = monthKeys[monthKeys.length - 1]
  const prevMonth = monthKeys.length > 1 ? monthKeys[monthKeys.length - 2] : null

  const latestDemand = latestMonth ? Number(monthly.demand?.[latestMonth] ?? 0) : 0
  const prevDemand = prevMonth ? Number(monthly.demand?.[prevMonth] ?? 0) : 0
  const growthVariance = prevDemand !== 0 ? (latestDemand - prevDemand) / Math.abs(prevDemand) : 0

  let accuracyPoints = 0
  let accuracySum = 0
  for (const item of payload.items ?? []) {
    for (const period of item.periods ?? []) {
      if (!isIsoDate(period)) continue
      const demand = asNumber(item.demand?.[period])
      const baseline = asNumber(item.forecastBaseline?.[period])
      if (demand === null || baseline === null || demand === 0) continue
      const acc = Math.max(0, 100 - (Math.abs(baseline - demand) / Math.abs(demand)) * 100)
      accuracySum += acc
      accuracyPoints += 1
    }
  }
  const forecastAccuracy = accuracyPoints > 0 ? Number((accuracySum / accuracyPoints).toFixed(2)) : 0

  return {
    totalRevenue: {
      value: Number(latestDemand.toFixed(2)),
      variance: Number(growthVariance.toFixed(3)),
      status: statusFromVariance(growthVariance),
    },
    stockoutRiskSkus: {
      value: 0,
      variance: 0,
      status: "stable",
    },
    forecastAccuracy: {
      value: forecastAccuracy,
      variance: 0,
      status: "stable",
    },
    growthRate: {
      value: Number((growthVariance * 100).toFixed(2)),
      variance: Number(growthVariance.toFixed(3)),
      status: statusFromVariance(growthVariance),
    },
  }
}
