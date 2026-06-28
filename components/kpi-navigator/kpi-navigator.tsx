"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { CircleHelp, Download, RefreshCw } from "lucide-react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
    type AggregationLabel,
    aggregateValueMap,
    buildAggregationBuckets,
    formatPeriodByFrequency,
    frequencyToLabel,
    getAvailableAggregationLabels,
    labelToFrequency,
    normalizeFrequency,
} from "@/lib/forecast-aggregation"
import { buildForecastSeriesKey, getForecastMetadata } from "@/lib/forecast-metadata"

type SkuMetadata = {
    sku?: string
    store?: string
    skuDesc?: string
    forecastMethod?: string
    ABCclass?: string
    ABCpercentage?: number
    isApproved?: boolean
}

type ForecastItem = {
    sku: string
    store?: string
    frequency?: string
    periods: string[]
    demand?: Record<string, number | null>
    forecastBaseline?: Record<string, number | null>
}

type ForecastValuesPayload = {
    frequency?: string
    items?: ForecastItem[]
}

type ValidationMetrics = {
    mae?: number
    rmse?: number
    smape?: number
}

type ValidationPerSeries = {
    seriesKey?: string
    sku?: string
    store?: string
    windows?: number
    modelUsed?: string
    plannedMethod?: string
    metrics?: ValidationMetrics
}

type ValidationSelectedModel = {
    model?: string
    mode?: string
    metrics?: ValidationMetrics
    perSeries?: ValidationPerSeries[]
}

type ReportSummaryPayload = {
    runConfig?: {
        executedModel?: string
        executedMode?: string
        detectedFrequency?: string
    }
    validation?: {
        selectedModel?: ValidationSelectedModel
    }
}

type ReplenishmentSignalItem = {
    sku?: string
    store?: string
    risk?: string
    daysOfCover?: number
    horizonDemand?: number
    predictedStockoutDate?: string | null
    recommendedReorderQty?: number
    reorderByDate?: string | null
}

type ValidationMetricKey = "smape" | "mae" | "rmse"
type PeriodMetricKey = "demand" | "forecast"
type ExceptionPreset = "all" | "a-class" | "low-accuracy" | "high-risk" | "stockout" | "low-confidence"
type ValidationSortKey = "smape" | "mae" | "rmse" | "demand" | "cover"

type ValidationRow = {
    seriesKey: string
    sku: string
    store: string
    skuLabel: string
    skuDesc: string
    abcClass: string
    method: string
    smape: number
    mae: number
    rmse: number
    windows: number
    risk: string
    daysOfCover: number
    horizonDemand: number
    predictedStockoutDate: string | null
    recommendedReorderQty: number
    action: string
}

const parseResult = <T,>(payload: unknown): T | null => {
    if (!payload || typeof payload !== "object") return null
    const raw = (payload as { result?: unknown }).result
    if (typeof raw === "string") {
        try {
            return JSON.parse(raw) as T
        } catch {
            return null
        }
    }
    return (raw as T) ?? null
}

const toFiniteNumber = (value: unknown, fallback = 0) => {
    const parsed = typeof value === "number" ? value : Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

const compactNumber = (value: number) =>
    new Intl.NumberFormat("en-AU", {
        notation: Math.abs(value) >= 1000 ? "compact" : "standard",
        maximumFractionDigits: Math.abs(value) >= 1000 ? 1 : 0,
    }).format(value)

const formatMetricValue = (value: number) => value.toFixed(2)

const formatDateLabel = (value?: string | null) => {
    if (!value) return "--"
    const parsed = new Date(value)
    return Number.isFinite(parsed.getTime())
        ? parsed.toLocaleDateString("en-AU", { day: "2-digit", month: "short" })
        : value
}

const getAction = (row: ValidationRow) => {
    if (row.risk === "Critical") return "Replenish immediately"
    if (row.risk === "High" && row.smape >= 25) return "Replenish and review override"
    if (row.smape >= 30) return "Review forecast override"
    if (row.risk === "High" || row.risk === "Medium") return "Monitor replenishment risk"
    return "Monitor only"
}

const hasStockoutSoon = (value?: string | null) => {
    if (!value) return false
    const target = new Date(value)
    if (!Number.isFinite(target.getTime())) return false
    const now = new Date()
    const days = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return days <= 7
}

const MetricHelp = ({ formula }: { formula: string }) => (
    <Tooltip>
        <TooltipTrigger asChild>
            <button type="button" className="inline-flex text-muted-foreground" aria-label="Metric formula">
                <CircleHelp className="h-3.5 w-3.5" />
            </button>
        </TooltipTrigger>
        <TooltipContent sideOffset={6}>{formula}</TooltipContent>
    </Tooltip>
)

const buildValidationRows = (
    metadata: Record<string, SkuMetadata>,
    reportSummary: ReportSummaryPayload | null,
    replenishmentSignals: ReplenishmentSignalItem[]
) => {
    const replenishmentBySeries = new Map<string, ReplenishmentSignalItem>()
    replenishmentSignals.forEach((item) => {
        replenishmentBySeries.set(buildForecastSeriesKey(item.sku, item.store), item)
    })

    const perSeries = reportSummary?.validation?.selectedModel?.perSeries ?? []
    return perSeries.map((item) => {
        const sku = item.sku || item.seriesKey?.split("::")[0] || "Unknown"
        const store =
            item.store ||
            item.seriesKey?.split("::")[1] ||
            getForecastMetadata(metadata, sku, item.store)?.store ||
            "Unknown"
        const meta = getForecastMetadata(metadata, sku, store)
        const seriesKey = item.seriesKey || buildForecastSeriesKey(sku, store)
        const replenishment = replenishmentBySeries.get(seriesKey)
        const row: ValidationRow = {
            seriesKey,
            sku,
            store,
            skuLabel: `${sku} · ${store}`,
            skuDesc: meta?.skuDesc || "N/A",
            abcClass: meta?.ABCclass ?? "C",
            method:
                meta?.forecastMethod ??
                item.modelUsed ??
                item.plannedMethod ??
                reportSummary?.validation?.selectedModel?.model ??
                "-",
            smape: toFiniteNumber(item.metrics?.smape, 0),
            mae: toFiniteNumber(item.metrics?.mae, 0),
            rmse: toFiniteNumber(item.metrics?.rmse, 0),
            windows: toFiniteNumber(item.windows, 0),
            risk: replenishment?.risk ?? "Healthy",
            daysOfCover: toFiniteNumber(replenishment?.daysOfCover, 0),
            horizonDemand: toFiniteNumber(replenishment?.horizonDemand, 0),
            predictedStockoutDate: replenishment?.predictedStockoutDate ?? null,
            recommendedReorderQty: toFiniteNumber(replenishment?.recommendedReorderQty, 0),
            action: "Monitor only",
        }
        row.action = getAction(row)
        return row
    })
}

export const KpiNavigator = () => {
    const [metadata, setMetadata] = useState<Record<string, SkuMetadata>>({})
    const [payload, setPayload] = useState<ForecastValuesPayload>({ items: [] })
    const [reportSummary, setReportSummary] = useState<ReportSummaryPayload | null>(null)
    const [replenishmentSignals, setReplenishmentSignals] = useState<ReplenishmentSignalItem[]>([])
    const [activeView, setActiveView] = useState<"validation" | "period">("validation")
    const [storeFilter, setStoreFilter] = useState("all")
    const [selectedSeriesKey, setSelectedSeriesKey] = useState("")
    const [validationMetric, setValidationMetric] = useState<ValidationMetricKey>("smape")
    const [validationSort, setValidationSort] = useState<ValidationSortKey>("smape")
    const [exceptionPreset, setExceptionPreset] = useState<ExceptionPreset>("all")
    const [periodMetric, setPeriodMetric] = useState<PeriodMetricKey>("forecast")
    const [aggregationType, setAggregationType] = useState<AggregationLabel>("Monthly")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const loadData = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const [metaRes, valuesRes, reportRes, replenishmentRes] = await Promise.all([
                fetch("/api/get-skus-metadata", { cache: "no-store" }),
                fetch("/api/get-merged-sku-forecast-values", { cache: "no-store" }),
                fetch("/api/get-report-summary", { cache: "no-store" }),
                fetch("/api/get-replenishment-signals", { cache: "no-store" }),
            ])

            if (!metaRes.ok || !valuesRes.ok || !reportRes.ok || !replenishmentRes.ok) {
                throw new Error("Failed to load KPI navigator data")
            }

            const metaJson = await metaRes.json()
            const valuesJson = await valuesRes.json()
            const reportJson = await reportRes.json()
            const replenishmentJson = await replenishmentRes.json()

            const parsedMeta = parseResult<Record<string, SkuMetadata>>(metaJson) ?? {}
            const parsedValues = parseResult<ForecastValuesPayload>(valuesJson) ?? { items: [] }
            const parsedReport = parseResult<ReportSummaryPayload>(reportJson)
            const parsedReplenishment = parseResult<{ items?: ReplenishmentSignalItem[] }>(replenishmentJson)
            const items = parsedValues.items ?? []

            setMetadata(parsedMeta)
            setPayload({ ...parsedValues, items })
            setReportSummary(parsedReport ?? null)
            setReplenishmentSignals(parsedReplenishment?.items ?? [])
            setSelectedSeriesKey((prev) => {
                if (items.length === 0) return ""
                if (items.some((item) => buildForecastSeriesKey(item.sku, item.store) === prev)) return prev
                return buildForecastSeriesKey(items[0].sku, items[0].store)
            })
        } catch (e) {
            setMetadata({})
            setPayload({ items: [] })
            setReportSummary(null)
            setReplenishmentSignals([])
            setSelectedSeriesKey("")
            setError(e instanceof Error ? e.message : "Failed to load KPI navigator")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    const items = useMemo(() => payload.items ?? [], [payload.items])
    const validationRows = useMemo(
        () => buildValidationRows(metadata, reportSummary, replenishmentSignals),
        [metadata, reportSummary, replenishmentSignals]
    )

    const stores = useMemo(() => {
        const byMeta = Object.values(metadata).map((item) => item.store).filter((value): value is string => Boolean(value))
        const byValidation = validationRows.map((row) => row.store)
        return Array.from(new Set([...byMeta, ...byValidation])).sort()
    }, [metadata, validationRows])

    const visibleItems = useMemo(() => {
        if (storeFilter === "all") return items
        return items.filter((item) => {
            const meta = getForecastMetadata(metadata, item.sku, item.store)
            return (item.store || meta?.store || "Unknown") === storeFilter
        })
    }, [items, metadata, storeFilter])

    const filteredValidationRows = useMemo(() => {
        const rows = validationRows.filter((row) => (storeFilter === "all" ? true : row.store === storeFilter))
        const presetRows = rows.filter((row) => {
            if (exceptionPreset === "all") return true
            if (exceptionPreset === "a-class") return row.abcClass === "A"
            if (exceptionPreset === "low-accuracy") return row.smape >= 20
            if (exceptionPreset === "high-risk") return row.risk === "High" || row.risk === "Critical"
            if (exceptionPreset === "stockout") return hasStockoutSoon(row.predictedStockoutDate)
            if (exceptionPreset === "low-confidence") return row.windows <= 1
            return true
        })
        const sorted = [...presetRows].sort((a, b) => {
            if (validationSort === "smape") return b.smape - a.smape
            if (validationSort === "mae") return b.mae - a.mae
            if (validationSort === "rmse") return b.rmse - a.rmse
            if (validationSort === "demand") return b.horizonDemand - a.horizonDemand
            return a.daysOfCover - b.daysOfCover
        })
        return sorted
    }, [exceptionPreset, storeFilter, validationRows, validationSort])

    const skuOptions = visibleItems.map((item) => ({
        value: buildForecastSeriesKey(item.sku, item.store),
        sku: item.sku,
        store: item.store || getForecastMetadata(metadata, item.sku, item.store)?.store || "Unknown",
    }))

    useEffect(() => {
        if (visibleItems.length === 0) {
            setSelectedSeriesKey("")
            return
        }
        if (!visibleItems.some((item) => buildForecastSeriesKey(item.sku, item.store) === selectedSeriesKey)) {
            setSelectedSeriesKey(buildForecastSeriesKey(visibleItems[0].sku, visibleItems[0].store))
        }
    }, [selectedSeriesKey, visibleItems])

    const selectedItem = useMemo(
        () => visibleItems.find((item) => buildForecastSeriesKey(item.sku, item.store) === selectedSeriesKey),
        [selectedSeriesKey, visibleItems]
    )
    const selectedValidationRow = useMemo(
        () => validationRows.find((row) => row.seriesKey === selectedSeriesKey) ?? filteredValidationRows[0] ?? null,
        [filteredValidationRows, selectedSeriesKey, validationRows]
    )

    const baseFrequency = useMemo(
        () => normalizeFrequency(selectedItem?.frequency || payload.frequency || "monthly"),
        [selectedItem?.frequency, payload.frequency]
    )
    const availableAggregations = useMemo(() => getAvailableAggregationLabels(baseFrequency), [baseFrequency])
    const targetFrequency = useMemo(() => labelToFrequency(aggregationType), [aggregationType])

    useEffect(() => {
        const available = getAvailableAggregationLabels(baseFrequency)
        setAggregationType((prev) => (available.includes(prev) ? prev : frequencyToLabel(baseFrequency)))
    }, [baseFrequency])

    const periods = useMemo(() => {
        if (!selectedItem) return []
        return buildAggregationBuckets(selectedItem.periods ?? [], baseFrequency, targetFrequency).periods
    }, [selectedItem, baseFrequency, targetFrequency])

    const periodRows = useMemo(() => {
        return visibleItems.map((item) => {
            const itemBase = normalizeFrequency(item.frequency || payload.frequency || "monthly")
            const buckets = buildAggregationBuckets(item.periods ?? [], itemBase, targetFrequency)
            const demandMap = aggregateValueMap(item.demand, item.periods ?? [], buckets)
            const forecastMap = aggregateValueMap(item.forecastBaseline, item.periods ?? [], buckets)
            const values = periods.map((period) =>
                periodMetric === "demand" ? toFiniteNumber(demandMap[period], 0) : toFiniteNumber(forecastMap[period], 0)
            )
            const average = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
            const meta = getForecastMetadata(metadata, item.sku, item.store)
            return {
                seriesKey: buildForecastSeriesKey(item.sku, item.store),
                sku: item.sku,
                store: item.store || meta?.store || "Unknown",
                abcClass: meta?.ABCclass ?? "C",
                method: meta?.forecastMethod ?? reportSummary?.runConfig?.executedModel ?? "-",
                average,
                values,
            }
        })
    }, [metadata, payload.frequency, periodMetric, periods, reportSummary, targetFrequency, visibleItems])

    const selectedTrend = useMemo(() => {
        if (!selectedItem) return []
        const buildTrendPoints = (frequency: ReturnType<typeof labelToFrequency>) => {
            const trendPeriods = buildAggregationBuckets(selectedItem.periods ?? [], baseFrequency, frequency).periods
            const buckets = buildAggregationBuckets(selectedItem.periods ?? [], baseFrequency, frequency)
            const demandMap = aggregateValueMap(selectedItem.demand, selectedItem.periods ?? [], buckets)
            const forecastMap = aggregateValueMap(selectedItem.forecastBaseline, selectedItem.periods ?? [], buckets)
            return trendPeriods.map((period) => ({
                period: formatPeriodByFrequency(period, frequency),
                value:
                    periodMetric === "demand"
                        ? Number(toFiniteNumber(demandMap[period], 0).toFixed(2))
                        : Number(toFiniteNumber(forecastMap[period], 0).toFixed(2)),
            }))
        }

        const aggregatedPoints = buildTrendPoints(targetFrequency)
        if (aggregatedPoints.length > 1 || targetFrequency === baseFrequency) {
            return aggregatedPoints
        }
        return buildTrendPoints(baseFrequency)
    }, [baseFrequency, periodMetric, selectedItem, targetFrequency])

    const exportCsv = () => {
        if (activeView === "validation") {
            if (filteredValidationRows.length === 0) return
            const headers = ["SKU", "Store", "ABC", "Method", "sMAPE", "MAE", "RMSE", "Windows", "Risk", "Days Of Cover", "Action"]
            const rows = filteredValidationRows.map((row) => [
                row.sku,
                row.store,
                row.abcClass,
                row.method,
                row.smape.toFixed(2),
                row.mae.toFixed(2),
                row.rmse.toFixed(2),
                row.windows.toFixed(0),
                row.risk,
                row.daysOfCover.toFixed(1),
                row.action,
            ])
            const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", "kpi-explorer-validation.csv")
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
            return
        }

        if (periodRows.length === 0) return
        const headers = ["SKU", "Store", "ABC", "Method", "Average", ...periods.map((period) => formatPeriodByFrequency(period, targetFrequency))]
        const rows = periodRows.map((row) => [
            row.sku,
            row.store,
            row.abcClass,
            row.method,
            row.average.toFixed(2),
            ...row.values.map((value) => value.toFixed(2)),
        ])
        const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.setAttribute("download", "kpi-explorer-period.csv")
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    const goToRelativeSku = (direction: -1 | 1) => {
        if (skuOptions.length === 0 || !selectedSeriesKey) return
        const currentIndex = skuOptions.findIndex((option) => option.value === selectedSeriesKey)
        if (currentIndex === -1) return
        const nextIndex = (currentIndex + direction + skuOptions.length) % skuOptions.length
        setSelectedSeriesKey(skuOptions[nextIndex].value)
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto max-w-[2000px] space-y-5 p-5 min-w-0">
                <div>
                    <h1 className="mb-2 text-3xl font-bold text-foreground">KPI Explorer</h1>
                    <p className="text-muted-foreground">Switch between validation diagnostics and period-level demand or forecast exploration.</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={storeFilter} onValueChange={setStoreFilter}>
                            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Store" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All stores</SelectItem>
                                {stores.map((store) => (
                                    <SelectItem key={store} value={store}>{store}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Badge variant="outline">Model: {(reportSummary?.runConfig?.executedModel || reportSummary?.validation?.selectedModel?.model || "-").toUpperCase()}</Badge>
                        <Badge variant="outline">Mode: {(reportSummary?.runConfig?.executedMode || reportSummary?.validation?.selectedModel?.mode || "-").toUpperCase()}</Badge>
                        <Badge variant="outline">Frequency: {(reportSummary?.runConfig?.detectedFrequency || payload.frequency || "-").toUpperCase()}</Badge>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading} aria-label="Refresh">
                            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
                        <Button variant="outline" size="icon" onClick={exportCsv} aria-label="Export CSV">
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">Validation view uses latest-run series summaries</Badge>
                    <Badge variant="outline">Period view uses aggregated direct Demand and Forecast values</Badge>
                    <Badge variant="outline">SKU-location is the primary key</Badge>
                </div>

                {error ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                        Failed to load KPI explorer. {error}
                    </div>
                ) : (activeView === "validation" ? filteredValidationRows.length === 0 : periodRows.length === 0) ? (
                    <div className="rounded-md border bg-muted/30 p-8 text-center">
                        <p className="text-base font-medium">No KPI explorer data available</p>
                        <p className="mt-1 text-sm text-muted-foreground">Run a forecast first to populate this view.</p>
                    </div>
                ) : (
                    <Tabs value={activeView} onValueChange={(value) => setActiveView(value as "validation" | "period")} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="validation">Validation View</TabsTrigger>
                            <TabsTrigger value="period">Period View</TabsTrigger>
                        </TabsList>

                        <TabsContent value="validation" className="mt-4 space-y-4">
                            <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                                <Select value={exceptionPreset} onValueChange={(value) => setExceptionPreset(value as ExceptionPreset)}>
                                    <SelectTrigger className="w-[210px]"><SelectValue placeholder="Exception preset" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All items</SelectItem>
                                        <SelectItem value="a-class">A-class only</SelectItem>
                                        <SelectItem value="low-accuracy">Low accuracy</SelectItem>
                                        <SelectItem value="high-risk">High replenishment risk</SelectItem>
                                        <SelectItem value="stockout">Stockout soon</SelectItem>
                                        <SelectItem value="low-confidence">Low confidence</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={validationSort} onValueChange={(value) => setValidationSort(value as ValidationSortKey)}>
                                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="smape">Sort by sMAPE</SelectItem>
                                        <SelectItem value="mae">Sort by MAE</SelectItem>
                                        <SelectItem value="rmse">Sort by RMSE</SelectItem>
                                        <SelectItem value="demand">Sort by demand exposure</SelectItem>
                                        <SelectItem value="cover">Sort by days of cover</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={validationMetric} onValueChange={(value) => setValidationMetric(value as ValidationMetricKey)}>
                                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Metric" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="smape">sMAPE (%)</SelectItem>
                                        <SelectItem value="mae">MAE</SelectItem>
                                        <SelectItem value="rmse">RMSE</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Badge variant="outline">Rows: {filteredValidationRows.length}</Badge>
                            </div>

                            <div className="grid gap-4 grid-cols-1 xl:grid-cols-3">
                                <div className="xl:col-span-2 rounded-lg border">
                                    <div className="p-6 pb-3">
                                        <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
                                            Validation Exceptions
                                            <MetricHelp formula={validationMetric === "smape" ? "sMAPE = mean(2 * |Forecast - Demand| / (|Forecast| + |Demand|)) * 100" : validationMetric === "mae" ? "MAE = mean(|Forecast - Demand|)" : "RMSE = sqrt(mean((Forecast - Demand)^2))"} />
                                        </h2>
                                    </div>
                                    <div className="overflow-auto px-6 pb-6">
                                        <Table className="min-w-[1080px]">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>SKU-Location</TableHead>
                                                    <TableHead>ABC</TableHead>
                                                    <TableHead>Method</TableHead>
                                                    <TableHead className="text-right">sMAPE</TableHead>
                                                    <TableHead className="text-right">MAE</TableHead>
                                                    <TableHead className="text-right">RMSE</TableHead>
                                                    <TableHead className="text-right">Windows</TableHead>
                                                    <TableHead>Risk</TableHead>
                                                    <TableHead>Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredValidationRows.slice(0, 20).map((row) => (
                                                    <TableRow
                                                        key={row.seriesKey}
                                                        className={row.seriesKey === selectedValidationRow?.seriesKey ? "bg-muted/40" : ""}
                                                        onClick={() => setSelectedSeriesKey(row.seriesKey)}
                                                    >
                                                        <TableCell className="font-medium">{row.skuLabel}</TableCell>
                                                        <TableCell>{row.abcClass}</TableCell>
                                                        <TableCell>{row.method}</TableCell>
                                                        <TableCell className="text-right">{row.smape.toFixed(2)}%</TableCell>
                                                        <TableCell className="text-right">{row.mae.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right">{row.rmse.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right">{row.windows.toFixed(0)}</TableCell>
                                                        <TableCell>{row.risk}</TableCell>
                                                        <TableCell>{row.action}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                <div className="rounded-lg border p-6">
                                    <h2 className="text-lg font-semibold">Selected Exception</h2>
                                    <div className="mt-4 space-y-3 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Item</p>
                                            <p className="font-medium">{selectedValidationRow?.skuLabel ?? "--"}</p>
                                            <p className="text-muted-foreground">{selectedValidationRow?.skuDesc ?? ""}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-muted-foreground">sMAPE</p>
                                                <p className="font-medium">{selectedValidationRow ? `${selectedValidationRow.smape.toFixed(2)}%` : "--"}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Windows</p>
                                                <p className="font-medium">{selectedValidationRow?.windows.toFixed(0) ?? "--"}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">MAE</p>
                                                <p className="font-medium">{selectedValidationRow?.mae.toFixed(2) ?? "--"}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">RMSE</p>
                                                <p className="font-medium">{selectedValidationRow?.rmse.toFixed(2) ?? "--"}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Risk</p>
                                                <p className="font-medium">{selectedValidationRow?.risk ?? "--"}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Days of cover</p>
                                                <p className="font-medium">{selectedValidationRow?.daysOfCover.toFixed(1) ?? "--"}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Demand exposure</p>
                                            <p className="font-medium">{selectedValidationRow ? compactNumber(selectedValidationRow.horizonDemand) : "--"}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Recommended action</p>
                                            <p className="font-medium">{selectedValidationRow?.action ?? "--"}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Stockout date</p>
                                            <p className="font-medium">{formatDateLabel(selectedValidationRow?.predictedStockoutDate)}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {selectedValidationRow ? (
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/forecasts/forecast-editor?sku=${encodeURIComponent(selectedValidationRow.sku)}&store=${encodeURIComponent(selectedValidationRow.store)}`}>
                                                        Open Editor
                                                    </Link>
                                                </Button>
                                            ) : null}
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href="/replenishments">Open Replenishment</Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="period" className="mt-4 space-y-4">
                            <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                                <Button variant="outline" size="sm" onClick={() => goToRelativeSku(-1)} disabled={skuOptions.length <= 1}>Prev SKU</Button>
                                <Select value={selectedSeriesKey || undefined} onValueChange={setSelectedSeriesKey}>
                                    <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select SKU" /></SelectTrigger>
                                    <SelectContent>
                                        {skuOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>{option.sku} · {option.store}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" size="sm" onClick={() => goToRelativeSku(1)} disabled={skuOptions.length <= 1}>Next SKU</Button>
                                <Select value={periodMetric} onValueChange={(value) => setPeriodMetric(value as PeriodMetricKey)}>
                                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Metric" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="forecast">Forecast</SelectItem>
                                        <SelectItem value="demand">Demand</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={aggregationType} onValueChange={(value) => setAggregationType(value as AggregationLabel)}>
                                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Aggregation" /></SelectTrigger>
                                    <SelectContent>
                                        {availableAggregations.map((option) => (
                                            <SelectItem key={option} value={option}>{option}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-4 grid-cols-1 xl:grid-cols-3">
                                <div className="xl:col-span-2 rounded-lg border">
                                    <div className="p-6 pb-3">
                                        <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
                                            Selected SKU Trend
                                            <MetricHelp formula={periodMetric === "forecast" ? "Forecast values are aggregated from the generated forecast output." : "Demand values are aggregated from the observed history in the merged forecast output."} />
                                        </h2>
                                    </div>
                                    <div className="px-6 pb-6">
                                        <ChartContainer
                                            config={{
                                                value: {
                                                    label: periodMetric === "forecast" ? "Forecast" : "Demand",
                                                    color: "hsl(var(--chart-1))",
                                                },
                                            }}
                                            className="h-[260px] w-full"
                                        >
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={selectedTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                                                    <YAxis tick={{ fontSize: 12 }} />
                                                    <ChartTooltip content={<ChartTooltipContent />} />
                                                    <Line type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </ChartContainer>
                                    </div>
                                </div>

                                <div className="rounded-lg border p-6">
                                    <h2 className="text-lg font-semibold">Selected SKU Detail</h2>
                                    <div className="mt-4 space-y-3 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Item</p>
                                            <p className="font-medium">
                                                {selectedItem
                                                    ? `${selectedItem.sku} · ${selectedItem.store || getForecastMetadata(metadata, selectedItem.sku, selectedItem.store)?.store || "Unknown"}`
                                                    : "--"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Validation snapshot</p>
                                            <p className="font-medium">
                                                {selectedValidationRow
                                                    ? `sMAPE ${selectedValidationRow.smape.toFixed(2)}%, ${selectedValidationRow.risk} risk`
                                                    : "--"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Recommended reorder</p>
                                            <p className="font-medium">{selectedValidationRow ? compactNumber(selectedValidationRow.recommendedReorderQty) : "--"}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Action</p>
                                            <p className="font-medium">{selectedValidationRow?.action ?? "--"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border">
                                <div className="p-6 pb-3">
                                    <h2 className="text-lg font-semibold">{periodMetric === "forecast" ? "Forecast" : "Demand"} Matrix</h2>
                                </div>
                                <div className="overflow-auto px-6 pb-6">
                                    <Table className="min-w-[980px]">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>SKU</TableHead>
                                                <TableHead>Store</TableHead>
                                                <TableHead>ABC</TableHead>
                                                <TableHead>Method</TableHead>
                                                <TableHead className="text-right">Average</TableHead>
                                                {periods.map((period) => (
                                                    <TableHead key={period} className="text-right">{formatPeriodByFrequency(period, targetFrequency)}</TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {periodRows.map((row) => (
                                                <TableRow key={row.seriesKey} className={row.seriesKey === selectedSeriesKey ? "bg-muted/40" : ""} onClick={() => setSelectedSeriesKey(row.seriesKey)}>
                                                    <TableCell className="font-medium">{row.sku}</TableCell>
                                                    <TableCell>{row.store}</TableCell>
                                                    <TableCell>{row.abcClass}</TableCell>
                                                    <TableCell>{row.method}</TableCell>
                                                    <TableCell className="text-right font-medium">{formatMetricValue(row.average)}</TableCell>
                                                    {row.values.map((value, index) => (
                                                        <TableCell key={index} className="text-right">{formatMetricValue(value)}</TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                        </Table>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </div>
    )
}
