"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, CircleHelp, Download, RefreshCw, TrendingDown, TrendingUp } from "lucide-react"
import {
    Line,
    LineChart,
    CartesianGrid,
    ResponsiveContainer,
    XAxis,
    YAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type SkuMetadata = {
    store: string
    skuDesc: string
    forecastMethod: string
    ABCclass: string
    ABCpercentage: number
    isApproved: boolean
}

type ForecastItem = {
    sku: string
    store?: string
    periods: string[]
    demand?: Record<string, number>
    forecastBaseline?: Record<string, number>
    demandAdjustment?: Record<string, number>
    forecastAdjustment?: Record<string, number>
    lower80?: Record<string, number>
    upper80?: Record<string, number>
}

type ForecastValuesPayload = {
    frequency?: string
    items?: ForecastItem[]
}

type RunItem = {
    runId: string
    status: string
    createdAt?: string
    summary?: string | Record<string, unknown>
}

type RiskRow = {
    sku: string
    store: string
    abcClass: string
    method: string
    avgError: number
    avgBias: number
    adjusted: boolean
}

type TrendPoint = {
    period: string
    accuracy: number
    error: number
    bias: number
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

const normalizePeriodLabel = (period: string) => {
    if (/^\d{2}-\d{4}$/.test(period)) {
        const [month, year] = period.split("-")
        return `${month}/${year}`
    }
    return period
}

const metricFromMaps = (
    demandMap: Record<string, number> | undefined,
    forecastMap: Record<string, number> | undefined,
    period: string
) => {
    const demand = Number(demandMap?.[period] ?? 0)
    const forecast = Number(forecastMap?.[period] ?? 0)
    const denom = Math.max(1, Math.abs(demand))
    const error = (Math.abs(forecast - demand) / denom) * 100
    const bias = ((forecast - demand) / denom) * 100
    return { demand, forecast, error, bias }
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

export const Kpis = () => {
    const [metadata, setMetadata] = useState<Record<string, SkuMetadata>>({})
    const [forecastPayload, setForecastPayload] = useState<ForecastValuesPayload>({ items: [] })
    const [runs, setRuns] = useState<RunItem[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [search, setSearch] = useState("")
    const [storeFilter, setStoreFilter] = useState("all")

    const loadData = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const [metaRes, valuesRes, runsRes] = await Promise.all([
                fetch("/api/get-skus-metadata", { cache: "no-store" }),
                fetch("/api/get-sku-forecast-values", { cache: "no-store" }),
                fetch("/api/list-forecast-runs?limit=50", { cache: "no-store" }),
            ])

            if (!metaRes.ok || !valuesRes.ok || !runsRes.ok) {
                throw new Error("One or more KPI data sources failed")
            }

            const metaJson = await metaRes.json()
            const valuesJson = await valuesRes.json()
            const runsJson = await runsRes.json()

            const parsedMeta = parseResult<Record<string, SkuMetadata>>(metaJson) ?? {}
            const parsedValues = parseResult<ForecastValuesPayload>(valuesJson) ?? { items: [] }

            setMetadata(parsedMeta)
            setForecastPayload({
                ...parsedValues,
                items: parsedValues.items ?? [],
            })
            setRuns((runsJson?.items ?? []) as RunItem[])
        } catch (e) {
            setMetadata({})
            setForecastPayload({ items: [] })
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
        const fromMeta = Object.values(metadata).map((m) => m.store)
        const fromItems = (forecastPayload.items ?? []).map((i) => i.store).filter((s): s is string => Boolean(s))
        return Array.from(new Set([...fromMeta, ...fromItems])).sort()
    }, [metadata, forecastPayload.items])

    const allRiskRows = useMemo<RiskRow[]>(() => {
        return (forecastPayload.items ?? []).map((item) => {
            const skuMeta = metadata[item.sku]
            const periods = item.periods ?? []

            let totalError = 0
            let totalBias = 0
            let points = 0
            let adjusted = false

            for (const period of periods) {
                const { error, bias } = metricFromMaps(item.demand, item.forecastBaseline, period)
                totalError += error
                totalBias += bias
                points += 1

                const demandAdj = Number(item.demandAdjustment?.[period] ?? item.demand?.[period] ?? 0)
                const demandOrig = Number(item.demand?.[period] ?? 0)
                const fcAdj = Number(item.forecastAdjustment?.[period] ?? item.forecastBaseline?.[period] ?? 0)
                const fcOrig = Number(item.forecastBaseline?.[period] ?? 0)
                if (Math.abs(demandAdj - demandOrig) > 0.0001 || Math.abs(fcAdj - fcOrig) > 0.0001) {
                    adjusted = true
                }
            }

            const avgError = points > 0 ? totalError / points : 0
            const avgBias = points > 0 ? totalBias / points : 0

            return {
                sku: item.sku,
                store: item.store || skuMeta?.store || "Unknown",
                abcClass: skuMeta?.ABCclass ?? "-",
                method: skuMeta?.forecastMethod ?? "-",
                avgError,
                avgBias,
                adjusted,
            }
        })
    }, [forecastPayload.items, metadata])

    const filteredRiskRows = useMemo(() => {
        const q = search.trim().toLowerCase()
        return allRiskRows
            .filter((row) => {
                if (storeFilter !== "all" && row.store !== storeFilter) return false
                if (!q) return true
                return (
                    row.sku.toLowerCase().includes(q) ||
                    row.store.toLowerCase().includes(q) ||
                    row.method.toLowerCase().includes(q)
                )
            })
            .sort((a, b) => b.avgError - a.avgError)
    }, [allRiskRows, search, storeFilter])

    const trend = useMemo<TrendPoint[]>(() => {
        const periodSet = new Set<string>()
        for (const item of forecastPayload.items ?? []) {
            for (const p of item.periods ?? []) periodSet.add(p)
        }
        const periods = Array.from(periodSet)

        return periods.map((period) => {
            let totalError = 0
            let totalBias = 0
            let count = 0
            for (const item of forecastPayload.items ?? []) {
                const { error, bias } = metricFromMaps(item.demand, item.forecastBaseline, period)
                totalError += error
                totalBias += bias
                count += 1
            }
            const avgError = count > 0 ? totalError / count : 0
            const avgBias = count > 0 ? totalBias / count : 0
            return {
                period: normalizePeriodLabel(period),
                error: Number(avgError.toFixed(2)),
                bias: Number(avgBias.toFixed(2)),
                accuracy: Number((100 - avgError).toFixed(2)),
            }
        })
    }, [forecastPayload.items])

    const overallStats = useMemo(() => {
        const rowCount = filteredRiskRows.length
        const totalError = filteredRiskRows.reduce((sum, row) => sum + row.avgError, 0)
        const totalBias = filteredRiskRows.reduce((sum, row) => sum + row.avgBias, 0)

        const avgError = rowCount > 0 ? totalError / rowCount : 0
        const avgBias = rowCount > 0 ? totalBias / rowCount : 0

        const accuracy = 100 - avgError
        const adjustedCount = filteredRiskRows.filter((row) => row.adjusted).length
        const atRiskCount = filteredRiskRows.filter((row) => row.abcClass === "A" && row.avgError >= 20).length

        const firstPeriod = (forecastPayload.items?.[0]?.periods ?? [])[0]
        const nextForecastTotal = (forecastPayload.items ?? []).reduce((sum, item) => {
            if (!firstPeriod) return sum
            return sum + Number(item.forecastBaseline?.[firstPeriod] ?? 0)
        }, 0)

        return {
            accuracy,
            avgBias,
            avgError,
            adjustedCount,
            atRiskCount,
            nextForecastTotal,
        }
    }, [filteredRiskRows, forecastPayload.items])

    const latestAndPrev = useMemo(() => {
        const sorted = [...runs].sort((a, b) => {
            const tA = new Date(a.createdAt ?? 0).getTime()
            const tB = new Date(b.createdAt ?? 0).getTime()
            return tB - tA
        })
        const latest = sorted[0]
        const previous = sorted[1]

        const latestSummary = parseSummary(latest?.summary)
        const prevSummary = parseSummary(previous?.summary)

        const getSmape = (summary: Record<string, unknown> | null) => {
            if (!summary) return null
            const validation = summary.validation as Record<string, unknown> | undefined
            const selected = validation?.selectedModel as Record<string, unknown> | undefined
            const metrics = selected?.metrics as Record<string, unknown> | undefined
            const value = metrics?.smape
            return typeof value === "number" ? value : null
        }

        const latestValue = getSmape(latestSummary)
        const prevValue = getSmape(prevSummary)

        return {
            latest,
            previous,
            latestSmape: latestValue,
            prevSmape: prevValue,
            delta: latestValue !== null && prevValue !== null ? latestValue - prevValue : null,
        }
    }, [runs])

    const topRisk = filteredRiskRows.slice(0, 10)

    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-[2000px] mx-auto px-5 py-8 min-w-0 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">KPIs</h1>
                        <p className="text-muted-foreground mt-1">
                            Forecast quality, risk signals, and operational impact in one view.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading} aria-label="Refresh KPIs">
                            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={topRisk.length === 0}
                            onClick={() => {
                                const headers = ["SKU", "Store", "ABC Class", "Method", "Avg Error %", "Avg Bias %", "Adjusted"]
                                const rows = topRisk.map((r) => [
                                    r.sku,
                                    r.store,
                                    r.abcClass,
                                    r.method,
                                    r.avgError.toFixed(2),
                                    r.avgBias.toFixed(2),
                                    r.adjusted ? "Yes" : "No",
                                ])
                                const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
                                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
                                const url = URL.createObjectURL(blob)
                                const link = document.createElement("a")
                                link.href = url
                                link.setAttribute("download", "kpi-risk-table.csv")
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                                URL.revokeObjectURL(url)
                            }}
                            aria-label="Export KPI table"
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Input
                        placeholder="Search SKU/store/method"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
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

                <Card>
                    <CardContent className="p-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">Accuracy: good ≥ 85%</Badge>
                        <Badge variant="outline">Error: good ≤ 10%</Badge>
                        <Badge variant="outline">Bias: good if |bias| ≤ 5%</Badge>
                        <Badge variant="outline">At-risk: A-class and Avg Error ≥ 20%</Badge>
                    </CardContent>
                </Card>

                {error ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                        Failed to load KPIs. {error}
                    </div>
                ) : filteredRiskRows.length === 0 ? (
                    <div className="rounded-md border bg-muted/30 p-8 text-center">
                        <p className="text-base font-medium">No KPI data yet</p>
                        <p className="text-sm text-muted-foreground mt-1">Upload source data and run a forecast to populate KPIs.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-6">
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-sm"><MetricTooltip label="Forecast Accuracy" formula="Accuracy = 100 - (|Forecast - Demand| / max(1, |Demand|)) * 100" /></CardTitle></CardHeader>
                                <CardContent><p className="text-2xl font-bold">{overallStats.accuracy.toFixed(1)}%</p></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-sm"><MetricTooltip label="Forecast Bias" formula="Bias = ((Forecast - Demand) / max(1, |Demand|)) * 100" /></CardTitle></CardHeader>
                                <CardContent><p className="text-2xl font-bold">{overallStats.avgBias.toFixed(1)}%</p></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-sm"><MetricTooltip label="Error (Avg)" formula="Error = (|Forecast - Demand| / max(1, |Demand|)) * 100" /></CardTitle></CardHeader>
                                <CardContent><p className="text-2xl font-bold">{overallStats.avgError.toFixed(1)}%</p></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-sm">A-Class At Risk</CardTitle></CardHeader>
                                <CardContent><p className="text-2xl font-bold">{overallStats.atRiskCount}</p></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-sm">Adjusted SKUs</CardTitle></CardHeader>
                                <CardContent><p className="text-2xl font-bold">{overallStats.adjustedCount}</p></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-sm">Next Period Forecast</CardTitle></CardHeader>
                                <CardContent><p className="text-2xl font-bold">{overallStats.nextForecastTotal.toFixed(0)}</p></CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-4 grid-cols-1 xl:grid-cols-3">
                            <Card className="xl:col-span-2">
                                <CardHeader>
                                    <CardTitle>Accuracy, Error and Bias Trend</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ChartContainer
                                        config={{
                                            accuracy: { label: "Accuracy", color: "hsl(var(--chart-1))" },
                                            error: { label: "Error", color: "hsl(var(--chart-3))" },
                                            bias: { label: "Bias", color: "hsl(var(--chart-4))" },
                                        }}
                                        className="h-[280px] w-full"
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={trend} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                                                <YAxis tick={{ fontSize: 12 }} />
                                                <ChartTooltip content={<ChartTooltipContent />} />
                                                <Line type="monotone" dataKey="accuracy" stroke="var(--color-accuracy)" strokeWidth={2} dot={false} />
                                                <Line type="monotone" dataKey="error" stroke="var(--color-error)" strokeWidth={2} dot={false} />
                                                <Line type="monotone" dataKey="bias" stroke="var(--color-bias)" strokeWidth={2} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Run Comparison</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Latest run</p>
                                        <p className="font-medium">{latestAndPrev.latest?.runId ?? "-"}</p>
                                        <Badge variant="secondary" className="mt-1">{latestAndPrev.latest?.status ?? "UNKNOWN"}</Badge>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Selected model sMAPE</p>
                                        <p className="font-medium">{latestAndPrev.latestSmape !== null ? `${latestAndPrev.latestSmape.toFixed(2)}%` : "-"}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-muted-foreground">Vs previous run</p>
                                        {latestAndPrev.delta === null ? (
                                            <span className="font-medium">-</span>
                                        ) : latestAndPrev.delta <= 0 ? (
                                            <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                                                <TrendingDown className="h-4 w-4" />
                                                {Math.abs(latestAndPrev.delta).toFixed(2)}%
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                                                <TrendingUp className="h-4 w-4" />
                                                {latestAndPrev.delta.toFixed(2)}%
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Top 10 At-Risk SKUs</CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-auto">
                                <Table className="min-w-[920px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>SKU</TableHead>
                                            <TableHead>Store</TableHead>
                                            <TableHead>ABC</TableHead>
                                            <TableHead>Method</TableHead>
                                            <TableHead className="text-right">Avg Error %</TableHead>
                                            <TableHead className="text-right">Avg Bias %</TableHead>
                                            <TableHead>Adjusted</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topRisk.map((row) => (
                                            <TableRow key={`${row.store}-${row.sku}`}>
                                                <TableCell className="font-medium">{row.sku}</TableCell>
                                                <TableCell>{row.store}</TableCell>
                                                <TableCell>{row.abcClass}</TableCell>
                                                <TableCell>{row.method}</TableCell>
                                                <TableCell className="text-right">{row.avgError.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">{row.avgBias.toFixed(2)}</TableCell>
                                                <TableCell>
                                                    {row.adjusted ? <Badge variant="secondary">Yes</Badge> : <Badge variant="outline">No</Badge>}
                                                </TableCell>
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

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <AlertTriangle className="h-4 w-4" />
                            At-risk SKUs are A-class with average error &ge; 20% in current filtered view.
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
