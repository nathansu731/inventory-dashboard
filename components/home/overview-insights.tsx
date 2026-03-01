"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { buildReplenishmentRows, type ReplenishmentRiskTier, type ReplenishmentRow } from "@/lib/replenishments"
import { sortMonthKeys } from "@/lib/forecasting"

type SkuMetadata = {
  store?: string
  skuDesc?: string
  forecastMethod?: string
  ABCclass?: string
}

type ForecastItem = {
  sku: string
  store?: string
  periods?: string[]
  demand?: Record<string, number>
  forecastBaseline?: Record<string, number>
}

type ForecastValuesPayload = {
  items?: ForecastItem[]
}

type DailyForecast = {
  sku: string
  date: string
  forecast: number
}

type ReplenishmentSignalItem = {
  sku: string
  store?: string
  skuDesc?: string
  abcClass?: string
  avgDailyDemand?: number
  horizonDemand?: number
  onHand?: number
  onHandSource?: "provided" | "estimated" | "unknown"
  daysOfCover?: number
  predictedStockoutDate?: string | null
  reorderByDate?: string | null
  recommendedReorderQty?: number
  leadTimeDays?: number
  safetyStockDays?: number
  risk?: ReplenishmentRiskTier
}

type ReplenishmentSignalResult = {
  generatedAt?: string | null
  items?: ReplenishmentSignalItem[]
}

type DemandSnapshotRow = {
  sku: string
  sales30d: number
  forecast30d: number
  deltaPct: string
  trend: string
}

type StockRiskRow = {
  sku: string
  onHand: number
  daysOfCover: number
  stockoutDate: string
  risk: "High" | "Medium" | "Low"
}

type ForecastAccuracyRow = {
  sku: string
  mape: string
  bias: string
  confidence: string
  lastUpdated: string
}

type PriorityActionRow = {
  sku: string
  issueType: string
  severity: "Critical" | "High" | "Moderate"
  recommendation: string
}

type SkuMetric = {
  sku: string
  latestDemand: number
  nextForecast: number
  deltaPctRaw: number
  avgError: number
  avgBias: number
}

const toDisplayDate = (value: string | null | undefined) => {
  if (!value) return "N/A"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
}

const trendFromDelta = (deltaPct: number) => {
  if (deltaPct >= 10) return "Rising"
  if (deltaPct <= -10) return "Softening"
  return "Stable"
}

const confidenceFromError = (avgError: number) => {
  if (avgError <= 10) return "High"
  if (avgError <= 20) return "Medium"
  return "Low"
}

const riskBadgeVariant = (risk: StockRiskRow["risk"]) => {
  if (risk === "High") return "destructive" as const
  if (risk === "Medium") return "secondary" as const
  return "outline" as const
}

const severityBadgeVariant = (severity: PriorityActionRow["severity"]) => {
  if (severity === "Critical") return "destructive" as const
  if (severity === "High") return "secondary" as const
  return "outline" as const
}

const normalizeRisk = (risk: ReplenishmentRiskTier): StockRiskRow["risk"] => {
  if (risk === "Critical" || risk === "High") return "High"
  if (risk === "Medium") return "Medium"
  return "Low"
}

async function fetchResult<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) return null
  const json = await res.json()
  const result = typeof json?.result === "string" ? JSON.parse(json.result) : json?.result
  return (result ?? null) as T | null
}

const computeSkuMetrics = (items: ForecastItem[]): SkuMetric[] => {
  return items.map((item) => {
    const periods = sortMonthKeys(item.periods ?? [])
    const demandMap = item.demand ?? {}
    const forecastMap = item.forecastBaseline ?? {}

    const latestDemandPeriod =
      [...periods].reverse().find((period) => demandMap[period] !== undefined) ??
      Object.keys(demandMap).sort().pop() ??
      null

    const demandPeriodIndex = latestDemandPeriod ? periods.indexOf(latestDemandPeriod) : -1
    const nextForecastPeriod =
      demandPeriodIndex >= 0 && demandPeriodIndex < periods.length - 1
        ? periods[demandPeriodIndex + 1]
        : periods[0] ?? latestDemandPeriod ?? null

    const latestDemand = Number(latestDemandPeriod ? demandMap[latestDemandPeriod] ?? 0 : 0)
    const nextForecast = Number(nextForecastPeriod ? forecastMap[nextForecastPeriod] ?? 0 : 0)
    const denom = Math.max(1, Math.abs(latestDemand))
    const deltaPctRaw = ((nextForecast - latestDemand) / denom) * 100

    let totalError = 0
    let totalBias = 0
    let points = 0
    for (const period of periods) {
      if (demandMap[period] === undefined || forecastMap[period] === undefined) continue
      const demand = Number(demandMap[period] ?? 0)
      const forecast = Number(forecastMap[period] ?? 0)
      const base = Math.max(1, Math.abs(demand))
      totalError += (Math.abs(forecast - demand) / base) * 100
      totalBias += ((forecast - demand) / base) * 100
      points += 1
    }

    return {
      sku: item.sku,
      latestDemand,
      nextForecast,
      deltaPctRaw,
      avgError: points > 0 ? totalError / points : 0,
      avgBias: points > 0 ? totalBias / points : 0,
    }
  })
}

const mapSignalRows = (signalItems: ReplenishmentSignalItem[]): ReplenishmentRow[] => {
  return signalItems.map((item) => ({
    sku: item.sku,
    skuDesc: item.skuDesc || "N/A",
    store: item.store || "Unknown",
    abcClass: item.abcClass || "C",
    avgDailyDemand: Number(item.avgDailyDemand ?? 0),
    horizonDemand: Number(item.horizonDemand ?? 0),
    estimatedOnHand: Number(item.onHand ?? 0),
    onHandSource: item.onHandSource || "unknown",
    daysOfCover: Number(item.daysOfCover ?? 0),
    predictedStockoutDate: item.predictedStockoutDate ?? null,
    reorderByDate: item.reorderByDate ?? null,
    recommendedReorderQty: Number(item.recommendedReorderQty ?? 0),
    leadTimeDays: Number(item.leadTimeDays ?? 0),
    safetyStockDays: Number(item.safetyStockDays ?? 0),
    risk: item.risk || "Healthy",
  }))
}

export function OverviewInsights() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forecastItems, setForecastItems] = useState<ForecastItem[]>([])
  const [replenishmentRows, setReplenishmentRows] = useState<ReplenishmentRow[]>([])
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const [forecastPayload, signals, metadata, dailyForecasts] = await Promise.all([
          fetchResult<ForecastValuesPayload>("/api/get-sku-forecast-values"),
          fetchResult<ReplenishmentSignalResult>("/api/get-replenishment-signals"),
          fetchResult<Record<string, SkuMetadata>>("/api/get-skus-metadata"),
          fetchResult<DailyForecast[]>("/api/get-daily-forecasts"),
        ])

        setForecastItems(Array.isArray(forecastPayload?.items) ? forecastPayload.items : [])
        setGeneratedAt(signals?.generatedAt ?? null)

        const signalItems = Array.isArray(signals?.items) ? signals.items : []
        if (signalItems.length > 0) {
          setReplenishmentRows(mapSignalRows(signalItems))
        } else if (metadata && dailyForecasts) {
          setReplenishmentRows(buildReplenishmentRows(metadata, dailyForecasts, 30))
        } else {
          setReplenishmentRows([])
        }
      } catch {
        setError("Failed to load overview insights.")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const skuMetrics = useMemo(() => computeSkuMetrics(forecastItems), [forecastItems])

  const demandSnapshotData = useMemo<DemandSnapshotRow[]>(() => {
    return [...skuMetrics]
      .sort((a, b) => Math.abs(b.deltaPctRaw) - Math.abs(a.deltaPctRaw))
      .slice(0, 10)
      .map((row) => ({
        sku: row.sku,
        sales30d: Math.round(row.latestDemand),
        forecast30d: Math.round(row.nextForecast),
        deltaPct: `${row.deltaPctRaw >= 0 ? "+" : ""}${row.deltaPctRaw.toFixed(1)}%`,
        trend: trendFromDelta(row.deltaPctRaw),
      }))
  }, [skuMetrics])

  const stockRiskData = useMemo<StockRiskRow[]>(() => {
    return replenishmentRows.slice(0, 10).map((row) => ({
      sku: row.sku,
      onHand: Math.round(row.estimatedOnHand),
      daysOfCover: Number(row.daysOfCover.toFixed(1)),
      stockoutDate: toDisplayDate(row.predictedStockoutDate),
      risk: normalizeRisk(row.risk),
    }))
  }, [replenishmentRows])

  const forecastAccuracyData = useMemo<ForecastAccuracyRow[]>(() => {
    const lastUpdated = generatedAt ? toDisplayDate(generatedAt) : toDisplayDate(new Date().toISOString())
    return [...skuMetrics]
      .sort((a, b) => b.avgError - a.avgError)
      .slice(0, 10)
      .map((row) => ({
        sku: row.sku,
        mape: `${row.avgError.toFixed(1)}%`,
        bias: `${row.avgBias >= 0 ? "+" : ""}${row.avgBias.toFixed(1)}%`,
        confidence: confidenceFromError(row.avgError),
        lastUpdated,
      }))
  }, [skuMetrics, generatedAt])

  const priorityActionData = useMemo<PriorityActionRow[]>(() => {
    const metricsBySku = new Map<string, SkuMetric>(skuMetrics.map((m) => [m.sku, m]))
    const fromRisk = replenishmentRows
      .filter((row) => row.risk !== "Healthy")
      .slice(0, 6)
      .map((row) => {
        const metric = metricsBySku.get(row.sku)
        const highError = (metric?.avgError ?? 0) > 20
        const issueType = highError ? "Low stock + forecast volatility" : "Low stock risk"
        const severity: PriorityActionRow["severity"] =
          row.risk === "Critical" ? "Critical" : row.risk === "High" ? "High" : "Moderate"
        const recommendation =
          row.recommendedReorderQty > 0
            ? `Order ${row.recommendedReorderQty.toLocaleString()} units and review lead time coverage.`
            : "Review reorder policy and monitor daily demand variance."
        return { sku: row.sku, issueType, severity, recommendation }
      })

    const fromAccuracy = [...skuMetrics]
      .filter((m) => m.avgError > 20 && !fromRisk.some((r) => r.sku === m.sku))
      .sort((a, b) => b.avgError - a.avgError)
      .slice(0, 4)
      .map((m) => ({
        sku: m.sku,
        issueType: "Low forecast accuracy",
        severity: "Moderate" as const,
        recommendation: "Review model selection, outliers, and demand adjustments for this SKU.",
      }))

    return [...fromRisk, ...fromAccuracy].slice(0, 10)
  }, [replenishmentRows, skuMetrics])

  const hasAnyData =
    demandSnapshotData.length > 0 ||
    stockRiskData.length > 0 ||
    forecastAccuracyData.length > 0 ||
    priorityActionData.length > 0

  if (loading) {
    return (
      <div className="px-4 text-sm text-muted-foreground lg:px-6">
        Loading overview insights...
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 lg:px-6">
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    )
  }

  if (!hasAnyData) {
    return (
      <div className="px-4 lg:px-6">
        <div className="rounded-md border bg-muted/30 p-8 text-center">
          <p className="text-base font-medium">No overview data yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload source data and run a forecast to populate overview insights.
          </p>
          <Link href="/data-input" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
            Upload Data
          </Link>
        </div>
      </div>
    )
  }

  return (
    <Tabs defaultValue="demand-snapshot" className="w-full flex-col gap-6 px-4 lg:px-6">
      <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
        <TabsTrigger value="demand-snapshot">Demand Snapshot</TabsTrigger>
        <TabsTrigger value="stock-risk">Stock Risk</TabsTrigger>
        <TabsTrigger value="forecast-accuracy">Forecast Accuracy</TabsTrigger>
        <TabsTrigger value="priority-actions">Priority Actions</TabsTrigger>
      </TabsList>

      <TabsContent value="demand-snapshot" className="mt-0">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Last 30d Sales</TableHead>
                <TableHead className="text-right">Next 30d Forecast</TableHead>
                <TableHead className="text-right">Forecast Delta</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demandSnapshotData.map((row) => (
                <TableRow key={row.sku}>
                  <TableCell className="font-medium">{row.sku}</TableCell>
                  <TableCell className="text-right">{row.sales30d.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.forecast30d.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.deltaPct}</TableCell>
                  <TableCell>{row.trend}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="stock-risk" className="mt-0">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">On Hand</TableHead>
                <TableHead className="text-right">Days of Cover</TableHead>
                <TableHead>Estimated Stockout</TableHead>
                <TableHead>Risk Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockRiskData.map((row) => (
                <TableRow key={row.sku}>
                  <TableCell className="font-medium">{row.sku}</TableCell>
                  <TableCell className="text-right">{row.onHand.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.daysOfCover}</TableCell>
                  <TableCell>{row.stockoutDate}</TableCell>
                  <TableCell>
                    <Badge variant={riskBadgeVariant(row.risk)}>{row.risk}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="forecast-accuracy" className="mt-0">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">MAPE</TableHead>
                <TableHead className="text-right">Bias</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forecastAccuracyData.map((row) => (
                <TableRow key={row.sku}>
                  <TableCell className="font-medium">{row.sku}</TableCell>
                  <TableCell className="text-right">{row.mape}</TableCell>
                  <TableCell className="text-right">{row.bias}</TableCell>
                  <TableCell>{row.confidence}</TableCell>
                  <TableCell>{row.lastUpdated}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="priority-actions" className="mt-0">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Issue Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Recommended Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {priorityActionData.map((row) => (
                <TableRow key={`${row.sku}-${row.issueType}`}>
                  <TableCell className="font-medium">{row.sku}</TableCell>
                  <TableCell>{row.issueType}</TableCell>
                  <TableCell>
                    <Badge variant={severityBadgeVariant(row.severity)}>{row.severity}</Badge>
                  </TableCell>
                  <TableCell>{row.recommendation}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  )
}
