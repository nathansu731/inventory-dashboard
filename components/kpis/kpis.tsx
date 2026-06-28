"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { AlertTriangle, CircleHelp, Download, RefreshCw, TrendingDown, TrendingUp } from "lucide-react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatRunStatusLabel } from "@/lib/run-status"
import { buildForecastSeriesKey, getForecastMetadata } from "@/lib/forecast-metadata"
import { useForecastCopilot } from "@/components/copilot/forecast-copilot-provider"

type SkuMetadata = {
    sku?: string
    store?: string
    skuDesc?: string
    forecastMethod?: string
    ABCclass?: string
    ABCpercentage?: number
    isApproved?: boolean
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
    totalSkus?: number
    totalSeries?: number
    rows?: number
    dateStart?: string
    dateEnd?: string
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
    validation?: {
        selectedModel?: ValidationSelectedModel
        arimaBaseline?: ValidationSelectedModel
    }
}

type MonthlyMetric = {
    value?: number
    variance?: number
    status?: "positive" | "negative" | "stable"
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
    risk?: string
    daysOfCover?: number
    horizonDemand?: number
    predictedStockoutDate?: string | null
    recommendedReorderQty?: number
    reorderByDate?: string | null
}

type RunItem = {
    runId: string
    status: string
    createdAt?: string
    summary?: string | Record<string, unknown>
}

type TrendPoint = {
    period: string
    accuracy: number
    smape: number
}

type RiskRow = {
    seriesKey: string
    sku: string
    store: string
    skuLabel: string
    abcClass: string
    method: string
    smape: number
    mae: number
    rmse: number
    windows: number
    risk: string
    daysOfCover: number
    horizonDemand: number
    recommendedReorderQty: number
    predictedStockoutDate: string | null
    action: string
}

type BreakdownRow = {
    label: string
    itemCount: number
    avgSmape: number
    atRiskCount: number
    atRiskDemand: number
}

const TREND_RUN_LIMIT = 10

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

const parseSummary = (summary: RunItem["summary"]): Record<string, unknown> | null => {
    if (!summary) return null
    if (typeof summary === "string") {
        try {
            return JSON.parse(summary) as Record<string, unknown>
        } catch {
            return null
        }
    }
    return summary
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

const formatPercent = (value: number, digits = 1) => `${value.toFixed(digits)}%`

const formatDateLabel = (value?: string | null) => {
    if (!value) return "--"
    const parsed = new Date(value)
    return Number.isFinite(parsed.getTime())
        ? parsed.toLocaleDateString("en-AU", { day: "2-digit", month: "short" })
        : value
}

const getRunSmape = (summary: Record<string, unknown> | null) => {
    if (!summary) return null
    const validation = summary.validation as Record<string, unknown> | undefined
    const selected = validation?.selectedModel as Record<string, unknown> | undefined
    const metrics = selected?.metrics as Record<string, unknown> | undefined
    const value = metrics?.smape
    return typeof value === "number" ? value : null
}

const getRunModel = (summary: Record<string, unknown> | null) => {
    if (!summary) return null
    const validation = summary.validation as Record<string, unknown> | undefined
    const selected = validation?.selectedModel as Record<string, unknown> | undefined
    const value = selected?.model
    return typeof value === "string" ? value : null
}

const formatTrendLabel = (run: RunItem, model: string | null, index: number) => {
    const createdAt = run.createdAt ? new Date(run.createdAt) : null
    const dateLabel =
        createdAt && Number.isFinite(createdAt.getTime())
            ? createdAt.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit" })
            : `Run ${index + 1}`
    return `${dateLabel} ${(model || "model").toUpperCase()}`
}

const MetricTooltip = ({ label, formula }: { label: string; formula: string }) => (
    <div className="inline-flex items-center gap-1">
        <span>{label}</span>
        <Tooltip>
            <TooltipTrigger asChild>
                <button type="button" className="inline-flex text-muted-foreground" aria-label={`${label} formula`}>
                    <CircleHelp className="h-3.5 w-3.5" />
                </button>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>{formula}</TooltipContent>
        </Tooltip>
    </div>
)

const summarizeBreakdown = (
    rows: RiskRow[],
    labelSelector: (row: RiskRow) => string
): BreakdownRow[] => {
    const groups = new Map<string, RiskRow[]>()
    rows.forEach((row) => {
        const key = labelSelector(row)
        const existing = groups.get(key) ?? []
        existing.push(row)
        groups.set(key, existing)
    })

    return Array.from(groups.entries())
        .map(([label, groupedRows]) => {
            const itemCount = groupedRows.length
            const avgSmape = groupedRows.reduce((sum, row) => sum + row.smape, 0) / Math.max(1, itemCount)
            const atRiskRows = groupedRows.filter((row) => row.smape >= 20 || row.risk === "Critical" || row.risk === "High")
            const atRiskDemand = atRiskRows.reduce((sum, row) => sum + row.horizonDemand, 0)
            return {
                label,
                itemCount,
                avgSmape,
                atRiskCount: atRiskRows.length,
                atRiskDemand,
            }
        })
        .sort((a, b) => b.atRiskDemand - a.atRiskDemand || b.avgSmape - a.avgSmape)
}

const describeAction = (row: RiskRow) => {
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
    const today = new Date()
    const days = (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    return days <= 7
}

export const Kpis = () => {
    const pathname = usePathname()
    const { setCopilotContext } = useForecastCopilot()
    const [metadata, setMetadata] = useState<Record<string, SkuMetadata>>({})
    const [reportSummary, setReportSummary] = useState<ReportSummaryPayload | null>(null)
    const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotalsResult | null>(null)
    const [replenishmentSignals, setReplenishmentSignals] = useState<ReplenishmentSignalItem[]>([])
    const [runs, setRuns] = useState<RunItem[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState("")
    const [storeFilter, setStoreFilter] = useState("all")

    const loadData = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const [metaRes, reportRes, totalsRes, replenishmentRes, runsRes] = await Promise.all([
                fetch("/api/get-skus-metadata", { cache: "no-store" }),
                fetch("/api/get-report-summary", { cache: "no-store" }),
                fetch("/api/get-monthly-totals", { cache: "no-store" }),
                fetch("/api/get-replenishment-signals", { cache: "no-store" }),
                fetch("/api/list-forecast-runs?limit=50", { cache: "no-store" }),
            ])

            if (!metaRes.ok || !reportRes.ok || !totalsRes.ok || !replenishmentRes.ok || !runsRes.ok) {
                throw new Error("One or more KPI data sources failed")
            }

            const metaJson = await metaRes.json()
            const reportJson = await reportRes.json()
            const totalsJson = await totalsRes.json()
            const replenishmentJson = await replenishmentRes.json()
            const runsJson = await runsRes.json()

            setMetadata(parseResult<Record<string, SkuMetadata>>(metaJson) ?? {})
            setReportSummary(parseResult<ReportSummaryPayload>(reportJson))
            setMonthlyTotals(parseResult<MonthlyTotalsResult>(totalsJson))
            setReplenishmentSignals(parseResult<{ items?: ReplenishmentSignalItem[] }>(replenishmentJson)?.items ?? [])
            setRuns((runsJson?.items ?? []) as RunItem[])
        } catch (e) {
            setMetadata({})
            setReportSummary(null)
            setMonthlyTotals(null)
            setReplenishmentSignals([])
            setRuns([])
            setError(e instanceof Error ? e.message : "Failed to load KPIs")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    const stores = useMemo(() => {
        const byMeta = Object.values(metadata).map((item) => item.store).filter((value): value is string => Boolean(value))
        const byValidation =
            reportSummary?.validation?.selectedModel?.perSeries
                ?.map((item) => item.store)
                .filter((value): value is string => Boolean(value)) ?? []
        return Array.from(new Set([...byMeta, ...byValidation])).sort()
    }, [metadata, reportSummary])

    const replenishmentBySeries = useMemo(() => {
        const map = new Map<string, ReplenishmentSignalItem>()
        replenishmentSignals.forEach((item) => {
            map.set(buildForecastSeriesKey(item.sku, item.store), item)
        })
        return map
    }, [replenishmentSignals])

    const allRiskRows = useMemo<RiskRow[]>(() => {
        const perSeries = reportSummary?.validation?.selectedModel?.perSeries ?? []
        return perSeries
            .map((item) => {
                const sku = item.sku || item.seriesKey?.split("::")[0] || "Unknown"
                const store =
                    item.store ||
                    item.seriesKey?.split("::")[1] ||
                    getForecastMetadata(metadata, sku, item.store)?.store ||
                    "Unknown"
                const meta = getForecastMetadata(metadata, sku, store)
                const seriesKey = item.seriesKey || buildForecastSeriesKey(sku, store)
                const replenishment = replenishmentBySeries.get(seriesKey)
                const row: RiskRow = {
                    seriesKey,
                    sku,
                    store,
                    skuLabel: `${sku} · ${store}`,
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
                    recommendedReorderQty: toFiniteNumber(replenishment?.recommendedReorderQty, 0),
                    predictedStockoutDate: replenishment?.predictedStockoutDate ?? null,
                    action: "Monitor only",
                }
                row.action = describeAction(row)
                return row
            })
            .sort((a, b) => b.horizonDemand - a.horizonDemand || b.smape - a.smape)
    }, [metadata, replenishmentBySeries, reportSummary])

    const filteredRows = useMemo(() => {
        const query = search.trim().toLowerCase()
        return allRiskRows.filter((row) => {
            if (storeFilter !== "all" && row.store !== storeFilter) return false
            if (!query) return true
            return (
                row.sku.toLowerCase().includes(query) ||
                row.seriesKey.toLowerCase().includes(query) ||
                row.method.toLowerCase().includes(query)
            )
        })
    }, [allRiskRows, search, storeFilter])

    const atRiskRows = useMemo(
        () => filteredRows.filter((row) => row.smape >= 20 || row.risk === "Critical" || row.risk === "High"),
        [filteredRows]
    )

    const topActions = useMemo(
        () =>
            [...filteredRows]
                .sort((a, b) => {
                    const stockoutWeight = Number(hasStockoutSoon(b.predictedStockoutDate)) - Number(hasStockoutSoon(a.predictedStockoutDate))
                    if (stockoutWeight !== 0) return stockoutWeight
                    return b.horizonDemand - a.horizonDemand || b.smape - a.smape
                })
                .slice(0, 10),
        [filteredRows]
    )

    const latestAndPrev = useMemo(() => {
        const sorted = [...runs].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
        const latest = sorted[0]
        const previous = sorted[1]
        const latestSummary = parseSummary(latest?.summary)
        const previousSummary = parseSummary(previous?.summary)
        const latestSmape = getRunSmape(latestSummary)
        const prevSmape = getRunSmape(previousSummary)
        return {
            latest,
            previous,
            latestSmape,
            prevSmape,
            latestModel: getRunModel(latestSummary),
            delta: latestSmape !== null && prevSmape !== null ? latestSmape - prevSmape : null,
        }
    }, [runs])

    useEffect(() => {
        const primaryRow = topActions[0] ?? filteredRows[0] ?? null
        setCopilotContext({
            runId: latestAndPrev.latest?.runId ?? null,
            pageId: "kpis",
            route: pathname || "/kpis",
            contextMode: "analysis",
            selectedSku: primaryRow?.sku ?? null,
            selectedStore: primaryRow?.store ?? (storeFilter !== "all" ? storeFilter : null),
        })

        return () => setCopilotContext(null)
    }, [filteredRows, latestAndPrev.latest?.runId, pathname, setCopilotContext, storeFilter, topActions])

    const trend = useMemo<TrendPoint[]>(() => {
        const sorted = [...runs].sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime())
        const points = sorted
            .map((run, index) => {
                const summary = parseSummary(run.summary)
                const smape = getRunSmape(summary)
                if (smape === null) return null
                return {
                    period: formatTrendLabel(run, getRunModel(summary), index),
                    smape: Number(smape.toFixed(2)),
                    accuracy: Number((100 - smape).toFixed(2)),
                }
            })
            .filter((point): point is TrendPoint => point !== null)
            .slice(-TREND_RUN_LIMIT)

        if (points.length > 0) return points
        const fallback = toFiniteNumber(reportSummary?.validation?.selectedModel?.metrics?.smape, 0)
        return [{ period: "Current Run", smape: fallback, accuracy: Number((100 - fallback).toFixed(2)) }]
    }, [reportSummary, runs])

    const breakdownByStore = useMemo(() => summarizeBreakdown(filteredRows, (row) => row.store), [filteredRows])
    const breakdownByClass = useMemo(() => summarizeBreakdown(filteredRows, (row) => row.abcClass), [filteredRows])
    const breakdownByMethod = useMemo(() => summarizeBreakdown(filteredRows, (row) => row.method), [filteredRows])

    const stats = useMemo(() => {
        const overallSmape =
            typeof reportSummary?.validation?.selectedModel?.metrics?.smape === "number"
                ? reportSummary.validation.selectedModel.metrics.smape
                : filteredRows.reduce((sum, row) => sum + row.smape, 0) / Math.max(1, filteredRows.length)
        const avgMae =
            typeof reportSummary?.validation?.selectedModel?.metrics?.mae === "number"
                ? reportSummary.validation.selectedModel.metrics.mae
                : filteredRows.reduce((sum, row) => sum + row.mae, 0) / Math.max(1, filteredRows.length)
        const avgRmse =
            typeof reportSummary?.validation?.selectedModel?.metrics?.rmse === "number"
                ? reportSummary.validation.selectedModel.metrics.rmse
                : filteredRows.reduce((sum, row) => sum + row.rmse, 0) / Math.max(1, filteredRows.length)
        const demandAtRisk = atRiskRows.reduce((sum, row) => sum + row.horizonDemand, 0)
        const aClassAtRisk = atRiskRows.filter((row) => row.abcClass === "A").length
        const stockoutIn7Days = filteredRows.filter((row) => hasStockoutSoon(row.predictedStockoutDate)).length
        const overrideCandidates = filteredRows.filter((row) => row.smape >= 25 || (row.risk === "Critical" && row.smape >= 15)).length
        const revenueOutlook = toFiniteNumber(monthlyTotals?.totalRevenue?.value, 0)
        const growthRate = toFiniteNumber(monthlyTotals?.growthRate?.value, 0)
        return {
            accuracyIndex: Math.max(0, 100 - overallSmape),
            smape: overallSmape,
            avgMae,
            avgRmse,
            demandAtRisk,
            aClassAtRisk,
            stockoutIn7Days,
            overrideCandidates,
            revenueOutlook,
            growthRate,
        }
    }, [atRiskRows, filteredRows, monthlyTotals, reportSummary])

    const assumptionsImpact = reportSummary?.futureAssumptionsDiagnostics?.dailyForecastImpact
    const assumptionsApplied = Boolean(reportSummary?.futureAssumptionsDiagnostics?.actionableOverridesProvided)

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto max-w-[2000px] space-y-5 p-5 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">KPIs</h1>
                        <p className="mt-1 text-muted-foreground">
                            Forecast health, operational exposure, and priority actions for the latest run.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading} aria-label="Refresh KPIs">
                            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={topActions.length === 0}
                            onClick={() => {
                                const headers = ["SKU", "Store", "ABC", "Method", "sMAPE", "MAE", "RMSE", "Risk", "Days Of Cover", "Action"]
                                const rows = topActions.map((row) => [
                                    row.sku,
                                    row.store,
                                    row.abcClass,
                                    row.method,
                                    row.smape.toFixed(2),
                                    row.mae.toFixed(2),
                                    row.rmse.toFixed(2),
                                    row.risk,
                                    row.daysOfCover.toFixed(1),
                                    row.action,
                                ])
                                const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
                                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
                                const url = URL.createObjectURL(blob)
                                const link = document.createElement("a")
                                link.href = url
                                link.setAttribute("download", "kpis-priority-actions.csv")
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                                URL.revokeObjectURL(url)
                            }}
                            aria-label="Export priority actions"
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Input
                        placeholder="Search SKU"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="w-full md:w-[320px]"
                    />
                    <Select value={storeFilter} onValueChange={setStoreFilter}>
                        <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Filter by store" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All stores</SelectItem>
                            {stores.map((store) => (
                                <SelectItem key={store} value={store}>
                                    {store}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">Accuracy index = 100 - sMAPE</Badge>
                    <Badge variant="outline">At-risk = sMAPE ≥ 20% or replenishment risk High/Critical</Badge>
                    <Badge variant="outline">MAE and RMSE are raw demand-unit errors</Badge>
                    {assumptionsApplied ? <Badge variant="outline">Forecast assumptions applied</Badge> : null}
                </div>

                {error ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                        Failed to load KPIs. {error}
                    </div>
                ) : filteredRows.length === 0 ? (
                    <div className="rounded-md border bg-muted/30 p-8 text-center">
                        <p className="text-base font-medium">No KPI data yet</p>
                        <p className="mt-1 text-sm text-muted-foreground">Upload source data and run a forecast to populate KPIs.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-7">
                            <Card className="flex h-full flex-col">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">
                                        <MetricTooltip label="Forecast Accuracy Index" formula="Accuracy index = 100 - sMAPE" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="mt-auto">
                                    <p className="text-2xl font-bold">{formatPercent(stats.accuracyIndex)}</p>
                                </CardContent>
                            </Card>
                            <Card className="flex h-full flex-col">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">
                                        <MetricTooltip label="Forecast Error (sMAPE)" formula="sMAPE = mean(2 * |Forecast - Demand| / (|Forecast| + |Demand|)) * 100" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="mt-auto">
                                    <p className="text-2xl font-bold">{formatPercent(stats.smape)}</p>
                                </CardContent>
                            </Card>
                            <Card className="flex h-full flex-col">
                                <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue Outlook</CardTitle></CardHeader>
                                <CardContent className="mt-auto">
                                    <p className="text-2xl font-bold">{compactNumber(stats.revenueOutlook)}</p>
                                    <p className="text-xs text-muted-foreground">Growth {formatPercent(stats.growthRate)}</p>
                                </CardContent>
                            </Card>
                            <Card className="flex h-full flex-col">
                                <CardHeader className="pb-2"><CardTitle className="text-sm">Demand At Risk</CardTitle></CardHeader>
                                <CardContent className="mt-auto">
                                    <p className="text-2xl font-bold">{compactNumber(stats.demandAtRisk)}</p>
                                    <p className="text-xs text-muted-foreground">30-day demand on exposed series</p>
                                </CardContent>
                            </Card>
                            <Card className="flex h-full flex-col">
                                <CardHeader className="pb-2"><CardTitle className="text-sm">A-Class At Risk</CardTitle></CardHeader>
                                <CardContent className="mt-auto"><p className="text-2xl font-bold">{stats.aClassAtRisk}</p></CardContent>
                            </Card>
                            <Card className="flex h-full flex-col">
                                <CardHeader className="pb-2"><CardTitle className="text-sm">Stockout In 7 Days</CardTitle></CardHeader>
                                <CardContent className="mt-auto"><p className="text-2xl font-bold">{stats.stockoutIn7Days}</p></CardContent>
                            </Card>
                            <Card className="flex h-full flex-col">
                                <CardHeader className="pb-2"><CardTitle className="text-sm">Override Candidates</CardTitle></CardHeader>
                                <CardContent className="mt-auto"><p className="text-2xl font-bold">{stats.overrideCandidates}</p></CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardContent className="flex flex-wrap items-center gap-2 p-3 text-xs text-muted-foreground">
                                <Badge variant="outline">Model: {(reportSummary?.runConfig?.executedModel || latestAndPrev.latestModel || "-").toUpperCase()}</Badge>
                                <Badge variant="outline">Mode: {(reportSummary?.runConfig?.executedMode || reportSummary?.validation?.selectedModel?.mode || "-").toUpperCase()}</Badge>
                                <Badge variant="outline">Frequency: {(reportSummary?.runConfig?.detectedFrequency || "-").toUpperCase()}</Badge>
                                <Badge variant="outline">Series: {reportSummary?.totalSeries ?? reportSummary?.totalSkus ?? filteredRows.length}</Badge>
                                <Badge variant="outline">Rows: {compactNumber(toFiniteNumber(reportSummary?.rows, 0))}</Badge>
                                <Badge variant="outline">Range: {formatDateLabel(reportSummary?.dateStart)} to {formatDateLabel(reportSummary?.dateEnd)}</Badge>
                            </CardContent>
                        </Card>

                        <div className="grid gap-4 grid-cols-1 xl:grid-cols-3">
                            <Card>
                                <CardHeader><CardTitle>Accuracy By Store</CardTitle></CardHeader>
                                <CardContent className="overflow-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Store</TableHead>
                                                <TableHead className="text-right">sMAPE</TableHead>
                                                <TableHead className="text-right">At Risk</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {breakdownByStore.slice(0, 8).map((row) => (
                                                <TableRow key={row.label}>
                                                    <TableCell>{row.label}</TableCell>
                                                    <TableCell className="text-right">{row.avgSmape.toFixed(2)}%</TableCell>
                                                    <TableCell className="text-right">{row.atRiskCount}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Accuracy By ABC Class</CardTitle></CardHeader>
                                <CardContent className="overflow-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Class</TableHead>
                                                <TableHead className="text-right">sMAPE</TableHead>
                                                <TableHead className="text-right">Demand At Risk</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {breakdownByClass.map((row) => (
                                                <TableRow key={row.label}>
                                                    <TableCell>{row.label}</TableCell>
                                                    <TableCell className="text-right">{row.avgSmape.toFixed(2)}%</TableCell>
                                                    <TableCell className="text-right">{compactNumber(row.atRiskDemand)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Method Exposure</CardTitle></CardHeader>
                                <CardContent className="overflow-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Method</TableHead>
                                                <TableHead className="text-right">Series</TableHead>
                                                <TableHead className="text-right">sMAPE</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {breakdownByMethod.slice(0, 8).map((row) => (
                                                <TableRow key={row.label}>
                                                    <TableCell>{row.label}</TableCell>
                                                    <TableCell className="text-right">{row.itemCount}</TableCell>
                                                    <TableCell className="text-right">{row.avgSmape.toFixed(2)}%</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Priority Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-auto">
                                <Table className="min-w-[1100px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>SKU-Location</TableHead>
                                            <TableHead>ABC</TableHead>
                                            <TableHead>Method</TableHead>
                                            <TableHead className="text-right">sMAPE</TableHead>
                                            <TableHead>Risk</TableHead>
                                            <TableHead className="text-right">Days Of Cover</TableHead>
                                            <TableHead className="text-right">Demand Exposure</TableHead>
                                            <TableHead>Action</TableHead>
                                            <TableHead className="text-right">Open</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topActions.map((row) => (
                                            <TableRow key={row.seriesKey}>
                                                <TableCell className="font-medium">{row.skuLabel}</TableCell>
                                                <TableCell>{row.abcClass}</TableCell>
                                                <TableCell>{row.method}</TableCell>
                                                <TableCell className="text-right">{row.smape.toFixed(2)}%</TableCell>
                                                <TableCell>{row.risk}</TableCell>
                                                <TableCell className="text-right">{row.daysOfCover.toFixed(1)}</TableCell>
                                                <TableCell className="text-right">{compactNumber(row.horizonDemand)}</TableCell>
                                                <TableCell>{row.action}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={`/forecasts/forecast-editor?sku=${encodeURIComponent(row.sku)}&store=${encodeURIComponent(row.store)}`}>
                                                            Open Editor
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
                            <Card>
                                <CardHeader><CardTitle>Validation Confidence</CardTitle></CardHeader>
                                <CardContent className="space-y-2 text-sm text-muted-foreground">
                                    <p>Average validation windows across filtered series: {(
                                        filteredRows.reduce((sum, row) => sum + row.windows, 0) / Math.max(1, filteredRows.length)
                                    ).toFixed(1)}</p>
                                    <p>Average MAE: {stats.avgMae.toFixed(1)}</p>
                                    <p>Average RMSE: {stats.avgRmse.toFixed(1)}</p>
                                    <p>
                                        {filteredRows.some((row) => row.windows <= 1)
                                            ? "Some series are scored with only one validation window. Treat item-level ranking as directional."
                                            : "Series have more than one validation window, which improves reliability of item-level ranking."}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Assumption Impact</CardTitle></CardHeader>
                                <CardContent className="space-y-2 text-sm text-muted-foreground">
                                    <p>{assumptionsApplied ? "Future assumptions were applied to this run." : "No actionable future assumptions were applied to this run."}</p>
                                    <p>
                                        Changed forecast points: {toFiniteNumber(assumptionsImpact?.affectedItemCount, 0)}
                                    </p>
                                    <p>
                                        Total forecast delta: {compactNumber(toFiniteNumber(assumptionsImpact?.totalAbsoluteForecastDelta, 0))}
                                    </p>
                                    <p>
                                        Use the priority action list to review items with both large forecast error and replenishment exposure.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-4 grid-cols-1 xl:grid-cols-3">
                            <Card className="xl:col-span-2">
                                <CardHeader>
                                    <CardTitle>Run History</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ChartContainer
                                        config={{
                                            accuracy: { label: "Accuracy", color: "hsl(var(--chart-1))" },
                                            smape: { label: "sMAPE", color: "hsl(var(--chart-3))" },
                                        }}
                                        className="h-[280px] w-full"
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={trend} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                                                <YAxis tick={{ fontSize: 12 }} />
                                                <ChartTooltip content={<ChartTooltipContent />} />
                                                <Line type="monotone" dataKey="accuracy" stroke="var(--color-accuracy)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                                <Line type="monotone" dataKey="smape" stroke="var(--color-smape)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Run Comparison</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Latest run</p>
                                        <p className="font-medium">{latestAndPrev.latest?.runId ?? "-"}</p>
                                        <Badge variant="secondary" className="mt-1">{formatRunStatusLabel(latestAndPrev.latest?.status)}</Badge>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Selected model sMAPE</p>
                                        <p className="font-medium">
                                            {latestAndPrev.latestSmape !== null ? formatPercent(latestAndPrev.latestSmape, 2) : "--"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Vs previous run</p>
                                        {latestAndPrev.delta === null ? (
                                            <span className="font-medium">--</span>
                                        ) : latestAndPrev.delta <= 0 ? (
                                            <span className="inline-flex items-center gap-1 font-medium text-green-600">
                                                <TrendingDown className="h-4 w-4" />
                                                {formatPercent(Math.abs(latestAndPrev.delta), 2)}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 font-medium text-red-600">
                                                <TrendingUp className="h-4 w-4" />
                                                {formatPercent(latestAndPrev.delta, 2)}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Adjustment impact</p>
                                        <p className="font-medium">
                                            {assumptionsImpact?.affectedItemCount
                                                ? `${assumptionsImpact.affectedItemCount} forecast points changed`
                                                : "No material assumption overrides"}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <AlertTriangle className="h-4 w-4" />
                            Customers should treat this page as an exception command center: summary on top, action rows below.
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
