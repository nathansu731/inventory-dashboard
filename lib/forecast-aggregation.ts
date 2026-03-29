export const AGGREGATION_LEVELS = ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"] as const
export type AggregationLabel = (typeof AGGREGATION_LEVELS)[number]
export type Frequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly"

const frequencyRank: Record<Frequency, number> = {
  daily: 0,
  weekly: 1,
  monthly: 2,
  quarterly: 3,
  yearly: 4,
}

export const normalizeFrequency = (value?: string): Frequency => {
  const lower = (value ?? "").toLowerCase()
  if (lower === "daily") return "daily"
  if (lower === "weekly") return "weekly"
  if (lower === "quarterly") return "quarterly"
  if (lower === "yearly") return "yearly"
  return "monthly"
}

export const frequencyToLabel = (value: Frequency): AggregationLabel => {
  if (value === "daily") return "Daily"
  if (value === "weekly") return "Weekly"
  if (value === "quarterly") return "Quarterly"
  if (value === "yearly") return "Yearly"
  return "Monthly"
}

export const labelToFrequency = (value: string): Frequency => normalizeFrequency(value)

export const getAvailableAggregationLabels = (baseFrequency: Frequency): AggregationLabel[] => {
  return AGGREGATION_LEVELS.filter((label) => frequencyRank[labelToFrequency(label)] >= frequencyRank[baseFrequency])
}

const toQuarter = (month: number) => Math.floor((month - 1) / 3) + 1

const getIsoWeek = (date: Date) => {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return { week: weekNo, year: utcDate.getUTCFullYear() }
}

const parsePeriodDate = (period: string, frequency: Frequency): Date | null => {
  if (frequency === "daily") {
    const date = new Date(period)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (frequency === "weekly") {
    const iso = period.match(/^(\d{4})-W(\d{1,2})$/i)
    if (iso) {
      const year = Number(iso[1])
      const week = Number(iso[2])
      const jan4 = new Date(Date.UTC(year, 0, 4))
      const jan4Day = jan4.getUTCDay() || 7
      const mondayWeek1 = new Date(jan4)
      mondayWeek1.setUTCDate(jan4.getUTCDate() - jan4Day + 1)
      mondayWeek1.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7)
      return new Date(mondayWeek1)
    }
    const date = new Date(period)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (frequency === "monthly") {
    const monthYear = period.match(/^(\d{1,2})-(\d{4})$/)
    if (!monthYear) return null
    const month = Number(monthYear[1])
    const year = Number(monthYear[2])
    return new Date(year, month - 1, 1)
  }

  if (frequency === "quarterly") {
    const qFormat = period.match(/^Q([1-4])[- ]?(\d{4})$/i)
    const yFormat = period.match(/^(\d{4})[- ]?Q([1-4])$/i)
    if (!qFormat && !yFormat) return null
    const quarter = Number((qFormat?.[1] ?? yFormat?.[2]) || 1)
    const year = Number((qFormat?.[2] ?? yFormat?.[1]) || 1970)
    const month = (quarter - 1) * 3
    return new Date(year, month, 1)
  }

  const yearOnly = period.match(/^(\d{4})$/)
  if (!yearOnly) return null
  return new Date(Number(yearOnly[1]), 0, 1)
}

const toBucketKey = (date: Date, target: Frequency) => {
  if (target === "daily") return date.toISOString().slice(0, 10)
  if (target === "weekly") {
    const { week, year } = getIsoWeek(date)
    return `${year}-W${String(week).padStart(2, "0")}`
  }
  if (target === "monthly") return `${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`
  if (target === "quarterly") return `Q${toQuarter(date.getMonth() + 1)}-${date.getFullYear()}`
  return `${date.getFullYear()}`
}

export type AggregationBuckets = {
  periods: string[]
  periodToBucket: Map<string, string>
}

export const buildAggregationBuckets = (
  periods: string[],
  fromFrequency: Frequency,
  toFrequency: Frequency
): AggregationBuckets => {
  if (fromFrequency === toFrequency) {
    return {
      periods,
      periodToBucket: new Map(periods.map((period) => [period, period])),
    }
  }

  const bucketPeriods: string[] = []
  const periodToBucket = new Map<string, string>()

  periods.forEach((period) => {
    const parsed = parsePeriodDate(period, fromFrequency)
    const bucket = parsed ? toBucketKey(parsed, toFrequency) : period
    periodToBucket.set(period, bucket)
    if (!bucketPeriods.includes(bucket)) bucketPeriods.push(bucket)
  })

  return { periods: bucketPeriods, periodToBucket }
}

export const aggregateValueMap = (
  values: Record<string, number> | undefined,
  sourcePeriods: string[],
  buckets: AggregationBuckets
): Record<string, number> => {
  const next: Record<string, number> = {}
  if (!values) return next

  sourcePeriods.forEach((period) => {
    const bucket = buckets.periodToBucket.get(period)
    if (!bucket) return
    const current = Number(next[bucket] ?? 0)
    const add = Number(values[period] ?? 0)
    next[bucket] = current + add
  })

  return next
}

export const formatPeriodByFrequency = (period: string, frequency: Frequency) => {
  if (frequency === "daily" || frequency === "weekly") {
    const week = period.match(/^(\d{4})-W(\d{1,2})$/i)
    if (week) return `W${String(Number(week[2])).padStart(2, "0")} ${week[1]}`
    const date = new Date(period)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }
    return period
  }
  if (frequency === "monthly") {
    const monthYear = period.match(/^(\d{1,2})-(\d{4})$/)
    if (!monthYear) return period
    const month = Number(monthYear[1])
    const year = Number(monthYear[2])
    return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" })
  }
  if (frequency === "quarterly") return period.replace("-", " ")
  return period
}
