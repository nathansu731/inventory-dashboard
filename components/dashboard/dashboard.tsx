'use client'

import {useEffect, useMemo, useState} from 'react'
import {useRouter} from 'next/navigation'
import {Button} from '@/components/ui/button'
import {AlertTriangle, Calendar, Download, Package, Plus, TrendingUp} from 'lucide-react'
import {DashboardDetailModal, SkuDetail} from '@/components/dashboard/dashboard-detail-modal'
import {DashboardMetricsTiles} from '@/components/dashboard/dashboard-metrics-tiles'
import {DashboardChartAndTable} from '@/components/dashboard/dashboard-chart-and-table'
import {DashboardRightPanel} from '@/components/dashboard/dashboard-right-panel'
import {fetchForecastResult, parseMonthKey, sortMonthKeys} from '@/lib/forecasting'

type SkuMetadata = {
  store: string
  skuDesc: string
  forecastMethod: string
  ABCclass: string
  ABCpercentage: number
  isApproved: boolean
}

type DailyForecast = {
  sku: string
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
  const [selectedSku, setSelectedSku] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [timeRange, setTimeRange] = useState<"1month" | "3months" | "6months" | "1year">("3months")
  const [riskLevelFilter, setRiskLevelFilter] = useState<"all" | "high" | "medium" | "low">("all")

  const [metadata, setMetadata] = useState<Record<string, SkuMetadata>>({})
  const [dailyForecasts, setDailyForecasts] = useState<DailyForecast[]>([])
  const [monthlyForecasts, setMonthlyForecasts] = useState<MonthlyForecasts | null>(null)
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null)
  const [notifications, setNotifications] = useState<ApiNotification[]>([])

  useEffect(() => {
    const loadDashboardData = async () => {
      const [meta, daily, monthly, summary, notificationsRes] = await Promise.all([
        fetchForecastResult<Record<string, SkuMetadata>>("/api/get-skus-metadata"),
        fetchForecastResult<DailyForecast[]>("/api/get-daily-forecasts"),
        fetchForecastResult<MonthlyForecasts>("/api/get-sku-forecasts"),
        fetchForecastResult<ReportSummary>("/api/get-report-summary"),
        fetch("/api/list-notifications?limit=8", { cache: "no-store" }).then((res) => (res.ok ? res.json() : null)),
      ])

      if (meta) setMetadata(meta)
      if (Array.isArray(daily)) setDailyForecasts(daily)
      if (monthly) setMonthlyForecasts(monthly)
      if (summary) setReportSummary(summary)
      setNotifications(((notificationsRes?.items ?? []) as ApiNotification[]))
    }

    loadDashboardData()
  }, [])

  const getRiskBadgeColor = (risk: string) => {
    switch (risk.toLowerCase()) {
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

  const openSkuModal = (sku: string) => {
    setSelectedSku(sku)
    setIsModalOpen(true)
  }

  const monthKeys = useMemo(() => {
    if (!monthlyForecasts) return []
    const firstMetric = Object.keys(monthlyForecasts)[0]
    if (!firstMetric) return []
    const keys = Object.keys(monthlyForecasts[firstMetric] || {}).filter((key) => key !== "average")
    return sortMonthKeys(keys)
  }, [monthlyForecasts])

  const chartData = useMemo(() => {
    if (!monthlyForecasts) return []
    const demand = monthlyForecasts.demand || {}
    const forecast = monthlyForecasts.forecastBaseline || {}
    const revenue = monthlyForecasts.revenue || {}

    return monthKeys.map((key) => {
      const parsed = parseMonthKey(key)
      const label = parsed
        ? new Date(parsed.year, parsed.month - 1, 1).toLocaleDateString("en-US", {
            month: "short",
            year: "2-digit",
          })
        : key
      return {
        month: label,
        actual: Number(demand[key] ?? 0),
        forecast: Number(forecast[key] ?? 0),
        revenue: Number(revenue[key] ?? 0),
      }
    })
  }, [monthlyForecasts, monthKeys])

  const skuForecastTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const row of dailyForecasts) {
      if (!row.sku) continue
      totals[row.sku] = (totals[row.sku] ?? 0) + Number(row.forecast ?? 0)
    }
    return totals
  }, [dailyForecasts])

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
      const riskLevel = abcClass === "A" ? "High" : abcClass === "B" ? "Medium" : "Low"
      return {
        sku,
        store: meta.store,
        abcClass,
        forecastMethod: meta.forecastMethod,
        forecastDemand: Math.round(skuForecastTotals[sku] ?? 0),
        riskLevel,
      }
    })

    return rows.filter((row) => {
      const matchesCategory = selectedCategory === "all" || row.store === selectedCategory
      const matchesRisk = riskLevelFilter === "all" || row.riskLevel.toLowerCase() === riskLevelFilter
      const matchesSearch =
        !searchTerm ||
        row.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.store.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesCategory && matchesRisk && matchesSearch
    })
  }, [metadata, selectedCategory, riskLevelFilter, searchTerm, skuForecastTotals])

  const skuDetailMap = useMemo(() => {
    const detail: Record<string, SkuDetail> = {}
    const forecastBySku: Record<string, DailyForecast[]> = {}
    for (const row of dailyForecasts) {
      if (!row.sku) continue
      if (!forecastBySku[row.sku]) forecastBySku[row.sku] = []
      forecastBySku[row.sku].push(row)
    }

    Object.entries(metadata).forEach(([sku, meta]) => {
      const series = (forecastBySku[sku] || [])
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((item) => ({
          date: item.date,
          forecast: Number(item.forecast ?? 0),
          upper80: Number(item.upper80 ?? 0),
          lower80: Number(item.lower80 ?? 0),
        }))

      detail[sku] = {
        sku,
        skuDesc: meta.skuDesc,
        store: meta.store,
        forecastMethod: meta.forecastMethod,
        abcClass: meta.ABCclass,
        abcPercentage: meta.ABCpercentage,
        forecastSeries: series,
      }
    })

    return detail
  }, [metadata, dailyForecasts])

  const getSelectedSkuData = () => {
    if (!selectedSku) return null
    return skuDetailMap[selectedSku] ?? null
  }

  const metricsData = useMemo(() => {
    const totalSkus = reportSummary?.totalSkus ?? Object.keys(metadata).length

    let accuracyPercent = 0
    if (monthlyForecasts?.demand && monthlyForecasts?.forecastBaseline) {
      const keys = Object.keys(monthlyForecasts.demand).filter((key) => key !== "average")
      const accuracies = keys.map((key) => {
        const demand = Number(monthlyForecasts.demand[key] ?? 0)
        const forecast = Number(monthlyForecasts.forecastBaseline[key] ?? 0)
        if (demand === 0) return 0
        const accuracy = 1 - Math.abs(forecast - demand) / Math.abs(demand)
        return Math.max(0, Math.min(1, accuracy))
      })
      if (accuracies.length) {
        accuracyPercent = (accuracies.reduce((a, b) => a + b, 0) / accuracies.length) * 100
      }
    }

    const riskCount = Object.values(metadata).filter((item) => item.ABCclass === "A").length
    const horizonDays = dailyForecasts.length
      ? new Set(dailyForecasts.map((row) => row.date)).size
      : 0

    return [
      {
        title: "Total SKUs",
        value: totalSkus ? totalSkus.toLocaleString() : "--",
        change: reportSummary && totalSkus ? `as of ${reportSummary.dateEnd}` : "",
        trend: "up" as const,
        icon: Package,
      },
      {
        title: "Forecast Accuracy",
        value: accuracyPercent ? `${accuracyPercent.toFixed(1)}%` : "--",
        change: accuracyPercent ? "avg last 12 months" : "",
        trend: "up" as const,
        icon: TrendingUp,
      },
      {
        title: "High-Value SKUs",
        value: totalSkus ? riskCount.toLocaleString() : "--",
        change: totalSkus ? "ABC class A" : "",
        trend: "up" as const,
        icon: AlertTriangle,
      },
      {
        title: "Forecast Horizon",
        value: horizonDays ? `${horizonDays} days` : "--",
        change: horizonDays ? "next period" : "",
        trend: "up" as const,
        icon: Calendar,
      },
    ]
  }, [reportSummary, metadata, monthlyForecasts, dailyForecasts])



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
    const points = timeRange === "1month" ? 1 : timeRange === "3months" ? 3 : timeRange === "6months" ? 6 : 12
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
        return {
          type,
          message: `Run ${n.runId} is ${status || "UPDATED"}.`,
          time: created,
        }
      })
  }, [notifications])

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[2000px] mx-auto px-5 py-8 min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between flex-col sm:flex-row gap-y-2 sm:gap-y-0">
            <div className="flex flex-col items-center md:items-start">
              <h1 className="text-2xl font-bold text-gray-900">SKU Forecasting Dashboard</h1>
              <p className="text-gray-600">Monitor inventory forecasts and demand patterns</p>
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
        </header>
        <div className="flex flex-col min-[1300px]:flex-row overflow-x-auto">
          <div className="flex-1 p-6">
            <DashboardMetricsTiles metrics={metricsData} />
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
          selectedSku={selectedSku}
          getSelectedSkuData={getSelectedSkuData}
        />
      </div>
    </div>
  )
}
