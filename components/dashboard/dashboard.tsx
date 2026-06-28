'use client'

import {useEffect, useMemo, useState} from 'react'
import {useRouter} from 'next/navigation'
import {Button} from '@/components/ui/button'
import {AlertTriangle, Calendar, Download, Package, Plus, TrendingUp} from 'lucide-react'
import {DashboardDetailModal, SkuDetail} from '@/components/dashboard/dashboard-detail-modal'
import {DashboardMetricsTiles} from '@/components/dashboard/dashboard-metrics-tiles'
import {DashboardChartAndTable} from '@/components/dashboard/dashboard-chart-and-table'
import {DashboardRightPanel} from '@/components/dashboard/dashboard-right-panel'
import { DashboardMetricInsight, DashboardMetricModal } from '@/components/dashboard/dashboard-metric-modal'
import {fetchForecastResult} from '@/lib/forecasting'
import { useProjectionDiagnostics } from "@/hooks/use-projection-diagnostics"
import { Badge } from "@/components/ui/badge"
import { extractFailureReason, formatRunStatusLabel } from "@/lib/run-status"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  buildForecastSeriesKey,
  getForecastMetadataDisplaySku,
  getForecastMetadataDisplayStore,
} from "@/lib/forecast-metadata"
import {
  buildReplenishmentException,
  type ReplenishmentException,
} from "@/lib/replenishment-exceptions"
import type { ReplenishmentRiskTier, ReplenishmentRow } from "@/lib/replenishments"

type SkuMetadata = {
  sku?: string
  store?: string
  skuDesc?: string
  forecastMethod?: string
  ABCclass?: string
  ABCpercentage?: number
  isApproved?: boolean
}

type DailyForecast = {
  sku: string
  store?: string
  date: string
  forecast: number
  lower80?: number
  upper80?: number
  lower95?: number
  upper95?: number
}

type ReportSummary = {
  totalSkus: number
  totalSeries?: number
  rows: number
  dateStart: string
  dateEnd: string
  runConfig?: {
    executedModel?: string
    executedMode?: string
    detectedFrequency?: string
  }
  futureAssumptionsDiagnostics?: {
    actionableOverridesProvided?: boolean
    dailyForecastImpact?: {
      affectedItemCount?: number
      totalAbsoluteForecastDelta?: number
    }
  }
}

type MonthlyMetric = {
  value: number
  variance: number
  status: "positive" | "negative" | "stable"
}

type MonthlyTotalsResult = {
  totalRevenue?: MonthlyMetric
  stockoutRiskSkus?: MonthlyMetric
  forecastAccuracy?: MonthlyMetric
  growthRate?: MonthlyMetric
}

type ReplenishmentSignalItem = {
  sku?: string
  store?: string
  risk?: ReplenishmentRiskTier
  daysOfCover?: number
  horizonDemand?: number
  predictedStockoutDate?: string | null
  recommendedReorderQty?: number
  reorderByDate?: string | null
  reason?: string
  onHandSource?: "provided" | "estimated" | "unknown"
}

type DashboardAlert = {
  type: string
  message: string
  time: string
}

type ApiNotification = {
  notificationId: string
  runId: string
  status: string
  createdAt?: string
  summary?: string | Record<string, unknown>
}

export const DashboardBody = () => {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [timeRange, setTimeRange] = useState<"7days" | "14days" | "21days" | "30days">("30days")
  const [riskLevelFilter, setRiskLevelFilter] = useState<"all" | "high" | "medium" | "low">("all")
  const [selectedMetricInsight, setSelectedMetricInsight] = useState<DashboardMetricInsight | null>(null)
  const [isMetricModalOpen, setIsMetricModalOpen] = useState(false)

  const [metadata, setMetadata] = useState<Record<string, SkuMetadata>>({})
  const [dailyForecasts, setDailyForecasts] = useState<DailyForecast[]>([])
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null)
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotalsResult | null>(null)
  const [replenishmentSignals, setReplenishmentSignals] = useState<ReplenishmentSignalItem[]>([])
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const projectionDiagnostics = useProjectionDiagnostics()

  useEffect(() => {
    const loadDashboardData = async () => {
      const [meta, daily, summary, totals, signals, notificationsRes] = await Promise.all([
        fetchForecastResult<Record<string, SkuMetadata>>("/api/get-skus-metadata"),
        fetchForecastResult<DailyForecast[]>("/api/get-daily-forecasts"),
        fetchForecastResult<ReportSummary>("/api/get-report-summary"),
        fetchForecastResult<MonthlyTotalsResult>("/api/get-monthly-totals"),
        fetchForecastResult<{ items?: ReplenishmentSignalItem[] }>("/api/get-replenishment-signals"),
        fetch("/api/list-notifications?limit=8", { cache: "no-store" }).then((res) => (res.ok ? res.json() : null)),
      ])

      if (meta) setMetadata(meta)
      if (Array.isArray(daily)) {
        setDailyForecasts(daily)
      }
      if (summary) setReportSummary(summary)
      if (totals) setMonthlyTotals(totals)
      setReplenishmentSignals(Array.isArray(signals?.items) ? signals.items : [])
      setNotifications(((notificationsRes?.items ?? []) as ApiNotification[]))
    }

    loadDashboardData()
  }, [])

  const getRiskBadgeColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "critical":
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "secondary"
      default:
        return "default"
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "critical":
        return "🔴"
      case "warning":
        return "🟡"
      case "info":
        return "🔵"
      default:
        return "ℹ️"
    }
  }

  const openSkuModal = (seriesKey: string) => {
    setSelectedSeriesKey(seriesKey)
    setIsModalOpen(true)
  }

  const chartData = useMemo(() => {
    const byDate = new Map<string, { forecast: number; lower80: number; upper80: number; seriesCount: number }>()
    for (const row of dailyForecasts) {
      const current = byDate.get(row.date) ?? { forecast: 0, lower80: 0, upper80: 0, seriesCount: 0 }
      current.forecast += Number(row.forecast ?? 0)
      current.lower80 += Number(row.lower80 ?? 0)
      current.upper80 += Number(row.upper80 ?? 0)
      current.seriesCount += 1
      byDate.set(row.date, current)
    }
    return Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({
        period: new Date(date).toLocaleDateString("en-AU", { day: "2-digit", month: "short" }),
        forecast: Number(value.forecast.toFixed(2)),
        lower80: Number(value.lower80.toFixed(2)),
        upper80: Number(value.upper80.toFixed(2)),
        seriesCount: value.seriesCount,
      }))
  }, [dailyForecasts])

  const skuForecastTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const row of dailyForecasts) {
      if (!row.sku) continue
      const seriesKey = buildForecastSeriesKey(row.sku, row.store)
      totals[seriesKey] = (totals[seriesKey] ?? 0) + Number(row.forecast ?? 0)
    }
    return totals
  }, [dailyForecasts])

  const replenishmentBySeries = useMemo(() => {
    const entries = new Map<string, ReplenishmentSignalItem>()
    for (const item of replenishmentSignals) {
      entries.set(buildForecastSeriesKey(item.sku, item.store), item)
    }
    return entries
  }, [replenishmentSignals])

  const categories = useMemo(() => {
    const stores = new Set<string>()
    Object.values(metadata).forEach((item) => {
      if (item.store) stores.add(item.store)
    })
    return Array.from(stores).sort()
  }, [metadata])

  const tableData = useMemo(() => {
    const rows = Object.entries(metadata).map(([sku, meta]) => {
      const abcClass = meta.ABCclass || "C"
      const replenishment = replenishmentBySeries.get(sku)
      const riskLevel = String(replenishment?.risk || (abcClass === "A" ? "High" : abcClass === "B" ? "Medium" : "Low"))
      return {
        seriesKey: sku,
        sku: getForecastMetadataDisplaySku(sku, meta),
        store: getForecastMetadataDisplayStore(sku, meta),
        abcClass,
        forecastMethod: meta.forecastMethod ?? "-",
        forecastDemand: Math.round(skuForecastTotals[sku] ?? 0),
        riskLevel,
      }
    })

    return rows.filter((row) => {
      const matchesCategory = selectedCategory === "all" || row.store === selectedCategory
      const normalizedRisk = row.riskLevel.toLowerCase()
      const matchesRisk =
        riskLevelFilter === "all" ||
        (riskLevelFilter === "high" && (normalizedRisk === "high" || normalizedRisk === "critical")) ||
        normalizedRisk === riskLevelFilter
      const matchesSearch =
        !searchTerm ||
        row.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.store.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesCategory && matchesRisk && matchesSearch
    })
  }, [metadata, replenishmentBySeries, selectedCategory, riskLevelFilter, searchTerm, skuForecastTotals])

  const skuDetailMap = useMemo(() => {
    const detail: Record<string, SkuDetail> = {}
    const forecastBySeries: Record<string, DailyForecast[]> = {}
    for (const row of dailyForecasts) {
      if (!row.sku) continue
      const seriesKey = buildForecastSeriesKey(row.sku, row.store)
      if (!forecastBySeries[seriesKey]) forecastBySeries[seriesKey] = []
      forecastBySeries[seriesKey].push(row)
    }

    Object.entries(metadata).forEach(([seriesKey, meta]) => {
      const series = (forecastBySeries[seriesKey] || [])
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((item) => ({
          date: item.date,
          forecast: Number(item.forecast ?? 0),
          upper80: Number(item.upper80 ?? 0),
          lower80: Number(item.lower80 ?? 0),
        }))

      detail[seriesKey] = {
        sku: getForecastMetadataDisplaySku(seriesKey, meta),
        skuDesc: meta.skuDesc,
        store: getForecastMetadataDisplayStore(seriesKey, meta),
        forecastMethod: meta.forecastMethod,
        abcClass: meta.ABCclass,
        abcPercentage: meta.ABCpercentage,
        forecastSeries: series,
      }
    })

    return detail
  }, [metadata, dailyForecasts])

  const getSelectedSkuData = () => {
    if (!selectedSeriesKey) return null
    return skuDetailMap[selectedSeriesKey] ?? null
  }

  const metricsData = useMemo(() => {
    const totalSkus = reportSummary?.totalSeries ?? reportSummary?.totalSkus ?? Object.keys(metadata).length
    const accuracyPercent = Number(monthlyTotals?.forecastAccuracy?.value ?? 0)
    const highRiskCount = replenishmentSignals.filter((item) => {
      const risk = String(item.risk || "").toLowerCase()
      return risk === "critical" || risk === "high"
    }).length
    const totalHorizonForecast = dailyForecasts.reduce((sum, row) => sum + Number(row.forecast ?? 0), 0)
    const horizonDays = new Set(dailyForecasts.map((row) => row.date)).size
    const soonestStockout = replenishmentSignals
      .map((item) => item.predictedStockoutDate)
      .filter((value): value is string => Boolean(value))
      .sort()[0]
    const assumptionsAffected = Number(reportSummary?.futureAssumptionsDiagnostics?.dailyForecastImpact?.affectedItemCount ?? 0)

    return [
      {
        title: "Total Series",
        value: Number.isFinite(totalSkus) ? totalSkus.toLocaleString() : "--",
        change: reportSummary && Number.isFinite(totalSkus) ? `${categories.length || 1} store views covered` : "",
        trend: "up" as const,
        icon: Package,
        insight: {
          title: "Total Series Coverage",
          value: Number.isFinite(totalSkus) ? totalSkus.toLocaleString() : "--",
          description: "Competitor dashboards typically surface coverage first so planners know whether they are looking at a complete item-location population.",
          bullets: [
            `${totalSkus} SKU-location series are represented in the current run.`,
            `${reportSummary?.dateStart || "--"} to ${reportSummary?.dateEnd || "--"} is the underlying history range.`,
            `${(reportSummary?.runConfig?.executedModel || "-").toUpperCase()} in ${(reportSummary?.runConfig?.executedMode || "-").toUpperCase()} mode produced the latest forecast.`,
          ],
          links: [
            { href: "/kpis", label: "Open KPI Summary" },
            { href: "/kpis/kpi-navigator", label: "Open KPI Explorer" },
          ],
        },
      },
      {
        title: "Forecast Accuracy",
        value: Number.isFinite(accuracyPercent) ? `${accuracyPercent.toFixed(1)}%` : "--",
        change: Number.isFinite(accuracyPercent) ? "validation-backed quality signal" : "",
        trend: "up" as const,
        icon: TrendingUp,
        insight: {
          title: "Forecast Accuracy",
          value: Number.isFinite(accuracyPercent) ? `${accuracyPercent.toFixed(1)}%` : "--",
          description: "Comparable demand-planning dashboards emphasize exception-based planning, so this tile is intended as a drilldown into forecast quality and where it breaks down.",
          bullets: [
            `Latest validation accuracy index is ${accuracyPercent.toFixed(1)}%.`,
            `${assumptionsAffected > 0 ? `${assumptionsAffected} forecast points were materially adjusted by assumptions.` : "No material assumption overrides were applied in the latest run."}`,
            `Use KPI pages to see which SKU-locations are driving error rather than treating this as a single pass/fail score.`,
          ],
          links: [
            { href: "/kpis", label: "Open KPI Summary" },
            { href: "/kpis/kpi-navigator", label: "Inspect Exceptions" },
          ],
        },
      },
      {
        title: "High-Risk Replenishment",
        value: Number.isFinite(highRiskCount) ? highRiskCount.toLocaleString() : "--",
        change: soonestStockout ? `earliest stockout ${soonestStockout}` : "no imminent stockout flagged",
        trend: highRiskCount > 0 ? ("down" as const) : ("up" as const),
        icon: AlertTriangle,
        insight: {
          title: "High-Risk Replenishment",
          value: Number.isFinite(highRiskCount) ? highRiskCount.toLocaleString() : "--",
          description: "Strong competitor dashboards connect forecast quality to inventory action. This tile focuses on immediate replenishment exposure rather than abstract demand error.",
          bullets: [
            `${highRiskCount} series are currently marked High or Critical risk.`,
            `${soonestStockout ? `Earliest projected stockout is ${soonestStockout}.` : "No projected stockout date is currently within the horizon."}`,
            "Use replenishment view to prioritise reorder actions and days-of-cover exceptions.",
          ],
          links: [
            { href: "/replenishments", label: "Open Replenishments" },
            { href: "/kpis", label: "Open Priority Actions" },
          ],
        },
      },
      {
        title: "30-Day Forecast",
        value: Number.isFinite(totalHorizonForecast) ? totalHorizonForecast.toLocaleString() : "--",
        change: horizonDays ? `${horizonDays} forecast days in view` : "",
        trend: "up" as const,
        icon: Calendar,
        insight: {
          title: "30-Day Forecast Outlook",
          value: Number.isFinite(totalHorizonForecast) ? totalHorizonForecast.toLocaleString() : "--",
          description: "This is the aggregated forecast demand across the generated horizon. Competitor dashboards usually put this at the center so planners immediately see the scale of what is coming.",
          bullets: [
            `${totalHorizonForecast.toLocaleString()} forecast units are planned across the next ${horizonDays} days.`,
            "The main chart now shows daily forecast, lower 80%, and upper 80% bands instead of collapsing the horizon into monthly points.",
            "Use the table or SKU modal to see which item-locations contribute most to the horizon total.",
          ],
          links: [
            { href: "/forecasts/forecast-navigator", label: "Open Forecast Navigator" },
            { href: "/forecasts/forecasting-summary", label: "Open Forecast Summary" },
          ],
        },
      },
    ]
  }, [reportSummary, metadata, monthlyTotals, replenishmentSignals, dailyForecasts, categories.length])

  const dashboardInsights = useMemo(() => {
    const peakDay = chartData.reduce((best, item) => (item.forecast > (best?.forecast ?? -1) ? item : best), chartData[0])
    const zeroDays = chartData.filter((item) => item.forecast === 0).length
    const topStore = tableData.reduce<{ store: string; forecast: number } | null>((best, row) => {
      const next = { store: row.store, forecast: row.forecastDemand }
      return !best || next.forecast > best.forecast ? next : best
    }, null)
    return [
      {
        title: "Peak Forecast Day",
        value: peakDay ? peakDay.period : "--",
        detail: peakDay ? `${Math.round(peakDay.forecast).toLocaleString()} units forecast` : "No daily forecast points available",
      },
      {
        title: "Zero-Forecast Days",
        value: zeroDays.toString(),
        detail: zeroDays > 0 ? "Often reflects closures or hard overrides" : "No zeroed days in the current horizon",
      },
      {
        title: "Top Store Exposure",
        value: topStore?.store ?? "--",
        detail: topStore ? `${topStore.forecast.toLocaleString()} units in current table filter` : "No store exposure available",
      },
    ]
  }, [chartData, tableData])

  const openMetricInsight = (metric: { insight?: DashboardMetricInsight }) => {
    if (!metric.insight) return
    setSelectedMetricInsight(metric.insight)
    setIsMetricModalOpen(true)
  }



  const handleExportReport = () => {
    if (tableData.length === 0) return

    const headers = ["SKU", "Store", "ABC Class", "Forecast Method", "Forecast Demand", "Risk Level"]
    const rows = tableData.map((row) => [
      row.sku,
      row.store,
      row.abcClass,
      row.forecastMethod,
      String(row.forecastDemand),
      row.riskLevel,
    ])

    const escapeCell = (value: string) => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    const csv = [
      headers.map(escapeCell).join(","),
      ...rows.map((row) => row.map(escapeCell).join(",")),
    ].join("\n")

    const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"})
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "dashboard-report.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleAddSku = () => {
    router.push('/data-input')
  }

  const filteredChartData = useMemo(() => {
    const points = timeRange === "7days" ? 7 : timeRange === "14days" ? 14 : timeRange === "21days" ? 21 : 30
    if (points <= 0) return chartData
    return chartData.slice(-points)
  }, [chartData, timeRange])

  const alerts = useMemo<DashboardAlert[]>(() => {
    return notifications
      .slice(0, 5)
      .map((n) => {
        const status = (n.status || "").toUpperCase()
        const type = status === "FAILED" ? "critical" : status === "DONE" ? "info" : "warning"
        const created = n.createdAt ? new Date(n.createdAt).toLocaleString() : "Latest"
        const statusLabel = formatRunStatusLabel(n.status)
        const failureReason = status === "FAILED" ? extractFailureReason(n.summary) : null
        return {
          type,
          message: failureReason
            ? `Run ${n.runId} is ${statusLabel}: ${failureReason}`
            : `Run ${n.runId} is ${statusLabel}.`,
          time: created,
        }
      })
  }, [notifications])

  const exceptions = useMemo<ReplenishmentException[]>(() => {
    const items: ReplenishmentException[] = []

    const prioritizedReplenishment = replenishmentSignals
      .filter((item) => {
        const risk = String(item.risk || "").toLowerCase()
        return risk === "critical" || risk === "high"
      })
      .sort((a, b) => {
        const dateA = a.predictedStockoutDate || "9999-12-31"
        const dateB = b.predictedStockoutDate || "9999-12-31"
        return dateA.localeCompare(dateB)
      })
      .slice(0, 3)

    prioritizedReplenishment.forEach((item) => {
      const seriesKey = buildForecastSeriesKey(item.sku, item.store)
      const meta = metadata[seriesKey]
      const skuLabel = getForecastMetadataDisplaySku(seriesKey, meta || {})
      const storeLabel = getForecastMetadataDisplayStore(seriesKey, meta || {})
      const risk = item.risk || "High"
      const row: ReplenishmentRow = {
        seriesKey,
        sku: skuLabel,
        skuDesc: meta?.skuDesc || "N/A",
        store: storeLabel,
        abcClass: meta?.ABCclass || "C",
        avgDailyDemand: 0,
        horizonDemand: Number(item.horizonDemand ?? 0),
        estimatedOnHand: 0,
        onHandSource: item.onHandSource || "unknown",
        daysOfCover: Number(item.daysOfCover ?? 0),
        predictedStockoutDate: item.predictedStockoutDate ?? null,
        reorderByDate: item.reorderByDate ?? null,
        recommendedReorderQty: Number(item.recommendedReorderQty ?? 0),
        leadTimeDays: 0,
        safetyStockDays: 0,
        risk,
        reason: item.reason || "Review replenishment coverage and reorder timing.",
      }
      items.push(buildReplenishmentException(row))
    })

    const topRiskRows = tableData
      .filter((row) => row.riskLevel.toLowerCase() === "high" || row.riskLevel.toLowerCase() === "critical")
      .slice(0, 2)

    topRiskRows.forEach((row) => {
      items.push({
        severity: "medium",
        title: `${row.sku} · ${row.store}`,
        detail: `${row.forecastDemand.toLocaleString()} forecast units over 30 days with ${row.riskLevel.toLowerCase()} risk exposure.`,
        actionHref: `/forecasts/forecast-editor?sku=${encodeURIComponent(row.sku)}&store=${encodeURIComponent(row.store)}`,
        actionLabel: "Open Forecast Editor",
      })
    })

    const assumptionsAffected = Number(reportSummary?.futureAssumptionsDiagnostics?.dailyForecastImpact?.affectedItemCount ?? 0)
    const assumptionsDelta = Number(reportSummary?.futureAssumptionsDiagnostics?.dailyForecastImpact?.totalAbsoluteForecastDelta ?? 0)
    if (assumptionsAffected > 0) {
      items.push({
        severity: "info",
        title: "Assumption impact detected",
        detail: `${assumptionsAffected} forecast points changed with total absolute delta ${Math.round(assumptionsDelta).toLocaleString()} units.`,
        actionHref: "/kpis",
        actionLabel: "Open KPI Summary",
      })
    }

    const failedRun = notifications.find((item) => String(item.status || "").toUpperCase() === "FAILED")
    if (failedRun) {
      const reason = extractFailureReason(failedRun.summary)
      items.push({
        severity: "critical",
        title: `Run ${failedRun.runId} failed`,
        detail: reason || "Latest failed run needs review.",
        actionHref: "/notifications",
        actionLabel: "Open Notifications",
      })
    }

    return items.slice(0, 6)
  }, [metadata, notifications, replenishmentSignals, reportSummary, tableData])

  const projectionGeneratedAtLabel = useMemo(() => {
    const raw = projectionDiagnostics?.projection?.generatedAt
    if (!raw) return null
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return raw
    return date.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }, [projectionDiagnostics?.projection?.generatedAt])

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[2000px] mx-auto p-5 min-w-0 space-y-5">
        <div className="flex items-center justify-between flex-col sm:flex-row gap-y-2 sm:gap-y-0">
          <div>
            <h1 className="text-3xl font-bold text-foreground">SKU Forecasting Dashboard</h1>
            <p className="text-muted-foreground mt-1">Monitor inventory forecasts and demand patterns.</p>
            {projectionDiagnostics?.projection?.updatedByRunId && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  Projection: {projectionDiagnostics.projection.updatedByRunId}
                  {projectionGeneratedAtLabel ? ` · ${projectionGeneratedAtLabel}` : ""}
                </Badge>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={handleExportReport} disabled={tableData.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button size="sm" onClick={handleAddSku}>
              <Plus className="w-4 h-4 mr-2" />
              Add SKU
            </Button>
          </div>
        </div>
        <div className="flex flex-col min-[1300px]:flex-row overflow-x-auto">
          <div className="flex-1 p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-8">
              {dashboardInsights.map((insight) => (
                <Card key={insight.title}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">{insight.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{insight.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">{insight.detail}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <DashboardMetricsTiles metrics={metricsData} onMetricClick={openMetricInsight} />
            <DashboardChartAndTable
              viewMode={viewMode}
              setViewMode={setViewMode}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              openSkuModal={openSkuModal}
              getRiskBadgeColor={getRiskBadgeColor}
              chartData={filteredChartData}
              tableData={tableData}
              categories={categories}
            />
          </div>
          <DashboardRightPanel
            getAlertIcon={getAlertIcon}
            alerts={alerts}
            exceptions={exceptions}
            categories={categories}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            riskLevelFilter={riskLevelFilter}
            setRiskLevelFilter={setRiskLevelFilter}
          />
        </div>
        <DashboardDetailModal
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          selectedSeriesKey={selectedSeriesKey}
          getSelectedSkuData={getSelectedSkuData}
        />
        <DashboardMetricModal
          insight={selectedMetricInsight}
          open={isMetricModalOpen}
          onOpenChange={setIsMetricModalOpen}
        />
      </div>
    </div>
  )
}
