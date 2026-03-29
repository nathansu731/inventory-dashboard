"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CircleHelp, Download, RefreshCw } from "lucide-react"
import {
    Line,
    LineChart,
    CartesianGrid,
    ResponsiveContainer,
    XAxis,
    YAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
    frequency?: string
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

type MetricKey = "accuracy" | "error" | "bias" | "demand" | "forecast"

const METRIC_OPTIONS: Array<{ value: MetricKey; label: string }> = [
    { value: "accuracy", label: "Accuracy (%)" },
    { value: "error", label: "Error (%)" },
    { value: "bias", label: "Bias (%)" },
    { value: "demand", label: "Demand" },
    { value: "forecast", label: "Forecast" },
]

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

const metricValue = (demandMap: Record<string, number>, forecastMap: Record<string, number>, period: string, metric: MetricKey) => {
    const demand = Number(demandMap[period] ?? 0)
    const forecast = Number(forecastMap[period] ?? 0)
    const denom = Math.max(1, Math.abs(demand))

    if (metric === "demand") return demand
    if (metric === "forecast") return forecast
    if (metric === "error") return (Math.abs(forecast - demand) / denom) * 100
    if (metric === "bias") return ((forecast - demand) / denom) * 100
    return 100 - (Math.abs(forecast - demand) / denom) * 100
}

const cellClass = (value: number, metric: MetricKey) => {
    if (metric === "accuracy") {
        if (value >= 85) return "bg-emerald-50 text-emerald-700"
        if (value >= 70) return "bg-amber-50 text-amber-700"
        return "bg-red-50 text-red-700"
    }
    if (metric === "error") {
        if (value <= 10) return "bg-emerald-50 text-emerald-700"
        if (value <= 20) return "bg-amber-50 text-amber-700"
        return "bg-red-50 text-red-700"
    }
    if (metric === "bias") {
        const abs = Math.abs(value)
        if (abs <= 5) return "bg-emerald-50 text-emerald-700"
        if (abs <= 15) return "bg-amber-50 text-amber-700"
        return "bg-red-50 text-red-700"
    }
    return ""
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

export const KpiNavigator = () => {
    const [metadata, setMetadata] = useState<Record<string, SkuMetadata>>({})
    const [payload, setPayload] = useState<ForecastValuesPayload>({ items: [] })
    const [metric, setMetric] = useState<MetricKey>("accuracy")
    const [storeFilter, setStoreFilter] = useState("all")
    const [selectedSku, setSelectedSku] = useState("")
    const [aggregationType, setAggregationType] = useState<AggregationLabel>("Monthly")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const loadData = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const [metaRes, valuesRes] = await Promise.all([
                fetch("/api/get-skus-metadata", { cache: "no-store" }),
                fetch("/api/get-sku-forecast-values", { cache: "no-store" }),
            ])
            if (!metaRes.ok || !valuesRes.ok) {
                throw new Error("Failed to load KPI navigator data")
            }

            const metaJson = await metaRes.json()
            const valuesJson = await valuesRes.json()
            const parsedMeta = parseResult<Record<string, SkuMetadata>>(metaJson) ?? {}
            const parsedValues = parseResult<ForecastValuesPayload>(valuesJson) ?? { items: [] }

            const items = parsedValues.items ?? []
            setMetadata(parsedMeta)
            setPayload({ ...parsedValues, items })
            setSelectedSku((prev) => {
                if (items.length === 0) return ""
                if (items.some((item) => item.sku === prev)) return prev
                return items[0].sku
            })
        } catch (e) {
            setMetadata({})
            setPayload({ items: [] })
            setSelectedSku("")
            setError(e instanceof Error ? e.message : "Failed to load KPI navigator")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    const items = useMemo(() => payload.items ?? [], [payload.items])

    const stores = useMemo(() => {
        const fromMeta = Object.values(metadata).map((m) => m.store)
        const fromItems = items.map((i) => i.store).filter((s): s is string => Boolean(s))
        return Array.from(new Set([...fromMeta, ...fromItems])).sort()
    }, [items, metadata])

    const visibleItems = useMemo(() => {
        if (storeFilter === "all") return items
        return items.filter((item) => (item.store || metadata[item.sku]?.store || "Unknown") === storeFilter)
    }, [items, metadata, storeFilter])

    const skuOptions = visibleItems.map((item) => item.sku)

    useEffect(() => {
        if (visibleItems.length === 0) {
            setSelectedSku("")
            return
        }
        if (!visibleItems.some((item) => item.sku === selectedSku)) {
            setSelectedSku(visibleItems[0].sku)
        }
    }, [selectedSku, visibleItems])

    const selectedItem = useMemo(() => visibleItems.find((i) => i.sku === selectedSku), [selectedSku, visibleItems])
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

    const tableRows = useMemo(() => {
        return visibleItems.map((item) => {
            const itemBase = normalizeFrequency(item.frequency || payload.frequency || "monthly")
            const buckets = buildAggregationBuckets(item.periods ?? [], itemBase, targetFrequency)
            const demandMap = aggregateValueMap(item.demand, item.periods ?? [], buckets)
            const forecastMap = aggregateValueMap(item.forecastBaseline, item.periods ?? [], buckets)
            const values = periods.map((period) => metricValue(demandMap, forecastMap, period, metric))
            const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
            const meta = metadata[item.sku]
            return {
                sku: item.sku,
                store: item.store || meta?.store || "Unknown",
                abcClass: meta?.ABCclass ?? "-",
                method: meta?.forecastMethod ?? "-",
                average: avg,
                values,
            }
        })
    }, [metric, metadata, payload.frequency, periods, targetFrequency, visibleItems])

    const selectedTrend = useMemo(() => {
        if (!selectedItem) return []
        const buckets = buildAggregationBuckets(selectedItem.periods ?? [], baseFrequency, targetFrequency)
        const demandMap = aggregateValueMap(selectedItem.demand, selectedItem.periods ?? [], buckets)
        const forecastMap = aggregateValueMap(selectedItem.forecastBaseline, selectedItem.periods ?? [], buckets)
        return periods.map((period) => ({
            period: formatPeriodByFrequency(period, targetFrequency),
            value: Number(metricValue(demandMap, forecastMap, period, metric).toFixed(2)),
        }))
    }, [baseFrequency, metric, periods, selectedItem, targetFrequency])

    const goToRelativeSku = (direction: -1 | 1) => {
        if (skuOptions.length === 0 || !selectedSku) return
        const idx = skuOptions.findIndex((sku) => sku === selectedSku)
        if (idx === -1) return
        const next = (idx + direction + skuOptions.length) % skuOptions.length
        setSelectedSku(skuOptions[next])
    }

    const exportCsv = () => {
        if (tableRows.length === 0) return
        const headers = ["SKU", "Store", "ABC", "Method", "Average", ...periods.map((period) => formatPeriodByFrequency(period, targetFrequency))]
        const rows = tableRows.map((row) => [
            row.sku,
            row.store,
            row.abcClass,
            row.method,
            row.average.toFixed(2),
            ...row.values.map((v) => v.toFixed(2)),
        ])
        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.setAttribute("download", `kpi-navigator-${metric}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-[2000px] mx-auto p-5 min-w-0 space-y-5">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">KPI Navigator</h1>
                    <p className="text-muted-foreground">Drill into KPI performance by store, SKU, and period.</p>
                </div>

                <Card>
                    <CardContent className="p-3 flex flex-wrap items-center justify-between gap-3">
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

                            <Button variant="outline" size="sm" onClick={() => goToRelativeSku(-1)} disabled={skuOptions.length <= 1}>Prev SKU</Button>
                            <Select value={selectedSku || undefined} onValueChange={setSelectedSku}>
                                <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select SKU" /></SelectTrigger>
                                <SelectContent>
                                    {skuOptions.map((sku) => (
                                        <SelectItem key={sku} value={sku}>{sku}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" onClick={() => goToRelativeSku(1)} disabled={skuOptions.length <= 1}>Next SKU</Button>

                            <Select value={metric} onValueChange={(v: MetricKey) => setMetric(v)}>
                                <SelectTrigger className="w-[180px]"><SelectValue placeholder="KPI metric" /></SelectTrigger>
                                <SelectContent>
                                    {METRIC_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={aggregationType} onValueChange={(value) => setAggregationType(value as AggregationLabel)}>
                                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Aggregation" /></SelectTrigger>
                                <SelectContent>
                                    {availableAggregations.map((option) => (
                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Badge variant="outline">Frequency: {selectedItem?.frequency ?? payload.frequency ?? "unknown"}</Badge>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading} aria-label="Refresh">
                                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                            </Button>
                            <Button variant="outline" size="icon" onClick={exportCsv} disabled={tableRows.length === 0} aria-label="Export CSV">
                                <Download className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">Accuracy: good &gt;= 85%</Badge>
                        <Badge variant="outline">Error: good &lt;= 10%</Badge>
                        <Badge variant="outline">Bias: good if |bias| &lt;= 5%</Badge>
                        <Badge variant="outline">Demand/Forecast: raw quantities</Badge>
                    </CardContent>
                </Card>

                {error ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                        Failed to load KPI navigator. {error}
                    </div>
                ) : tableRows.length === 0 ? (
                    <div className="rounded-md border bg-muted/30 p-8 text-center">
                        <p className="text-base font-medium">No KPI navigator data available</p>
                        <p className="text-sm text-muted-foreground mt-1">Run a forecast first to populate this view.</p>
                    </div>
                ) : (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle className="inline-flex items-center gap-2">{METRIC_OPTIONS.find((m) => m.value === metric)?.label} Matrix<MetricHelp formula={metric === "accuracy" ? "Accuracy = 100 - (|Forecast - Demand| / max(1, |Demand|)) * 100" : metric === "error" ? "Error = (|Forecast - Demand| / max(1, |Demand|)) * 100" : metric === "bias" ? "Bias = ((Forecast - Demand) / max(1, |Demand|)) * 100" : "Demand/Forecast are direct values from output artifacts"} /></CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-auto">
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
                                        {tableRows.map((row) => (
                                            <TableRow key={`${row.store}-${row.sku}`} className={row.sku === selectedSku ? "bg-muted/40" : ""}>
                                                <TableCell className="font-medium">{row.sku}</TableCell>
                                                <TableCell>{row.store}</TableCell>
                                                <TableCell>{row.abcClass}</TableCell>
                                                <TableCell>{row.method}</TableCell>
                                                <TableCell className={`text-right font-medium ${cellClass(row.average, metric)}`}>
                                                    {row.average.toFixed(2)}
                                                </TableCell>
                                                {row.values.map((value, idx) => (
                                                    <TableCell key={idx} className={`text-right ${cellClass(value, metric)}`}>
                                                        {value.toFixed(2)}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Selected SKU Trend ({selectedSku || "-"})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer
                                    config={{
                                        value: {
                                            label: METRIC_OPTIONS.find((m) => m.value === metric)?.label ?? "Value",
                                            color: "hsl(var(--chart-1))",
                                        },
                                    }}
                                    className="h-[250px] w-full"
                                >
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={selectedTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Line type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={2} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    )
}
