"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ForecastTable } from "@/components/forecast-navigator/forecast-table"
import { ForecastChart } from "@/components/forecast-navigator/forecast-chart"

type ForecastItem = {
    sku: string
    store?: string
    frequency?: string
    periods: string[]
    demand?: Record<string, number>
    forecastBaseline?: Record<string, number>
    demandAdjustment?: Record<string, number>
    forecastAdjustment?: Record<string, number>
    variance?: Record<string, number>
    revenue?: Record<string, number>
}

type ForecastValuesPayload = {
    frequency?: string
    items?: ForecastItem[]
}

type RowData = {
    label: string
    values: string[]
}

const LABEL_MAP: Array<{ key: keyof ForecastItem; label: string }> = [
    { key: "demand", label: "Demand" },
    { key: "forecastBaseline", label: "Forecast Baseline" },
    { key: "demandAdjustment", label: "Demand Adjustment" },
    { key: "forecastAdjustment", label: "Forecast Adjustment" },
    { key: "variance", label: "Variance" },
    { key: "revenue", label: "Revenue" },
]

const formatPeriod = (period: string) => {
    if (/^\d{2}-\d{4}$/.test(period)) {
        const [month, year] = period.split("-")
        return `${month}/${year}`
    }
    return period
}

export const ForecastNavigator = () => {
    const [payload, setPayload] = useState<ForecastValuesPayload>({ items: [] })
    const [selectedSku, setSelectedSku] = useState<string>("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/get-sku-forecast-values", { cache: "no-store" })
            if (!res.ok) throw new Error(`API error (${res.status})`)

            const { result } = await res.json()
            const parsed = (typeof result === "string" ? JSON.parse(result) : result) as ForecastValuesPayload
            const items = parsed?.items ?? []
            setPayload({ ...parsed, items })

            if (items.length > 0 && !items.some((item) => item.sku === selectedSku)) {
                setSelectedSku(items[0].sku)
            }
            if (items.length === 0) {
                setSelectedSku("")
            }
        } catch (e) {
            setPayload({ items: [] })
            setSelectedSku("")
            setError(e instanceof Error ? e.message : "Failed to load forecast navigator")
        } finally {
            setIsLoading(false)
        }
    }, [selectedSku])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const items = useMemo(() => payload.items ?? [], [payload.items])
    const skuOptions = useMemo(() => items.map((item) => item.sku), [items])

    const selectedItem = useMemo(() => {
        return items.find((item) => item.sku === selectedSku) ?? items[0]
    }, [items, selectedSku])

    const periods = useMemo(() => selectedItem?.periods ?? [], [selectedItem])

    const rowData: RowData[] = useMemo(() => {
        if (!selectedItem) return []

        return LABEL_MAP.map(({ key, label }) => {
            const map = (selectedItem[key] as Record<string, number> | undefined) ?? {}
            return {
                label,
                values: periods.map((period) => String(map[period] ?? 0)),
            }
        })
    }, [periods, selectedItem])

    const chartData = useMemo(() => {
        const demandRow = rowData.find((r) => r.label === "Demand")
        const baselineRow = rowData.find((r) => r.label === "Forecast Baseline")

        return periods.map((period, index) => ({
            month: formatPeriod(period),
            demand: Number(demandRow?.values[index] ?? 0),
            forecastBaseline: Number(baselineRow?.values[index] ?? 0),
        }))
    }, [periods, rowData])

    const handleExportCsv = () => {
        if (!selectedItem || periods.length === 0) return

        const headers = ["Metric", ...periods]
        const rows = rowData.map((row) => [row.label, ...row.values])
        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.setAttribute("download", `forecast-navigator-${selectedItem.sku}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mx-auto px-6 py-6 space-y-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Forecast Navigator</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Explore forecast values by SKU and compare demand against baseline.
                    </p>
                </div>

                <Card className="py-1">
                    <CardContent className="p-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Select value={selectedSku || undefined} onValueChange={setSelectedSku}>
                                <SelectTrigger className="w-[220px]">
                                    <SelectValue placeholder="Select SKU" />
                                </SelectTrigger>
                                <SelectContent>
                                    {skuOptions.map((sku) => (
                                        <SelectItem key={sku} value={sku}>
                                            {sku}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedItem?.store && <Badge variant="secondary">Store: {selectedItem.store}</Badge>}
                            <Badge variant="outline">Frequency: {selectedItem?.frequency ?? payload.frequency ?? "unknown"}</Badge>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading} aria-label="Refresh">
                                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleExportCsv}
                                disabled={!selectedItem || periods.length === 0}
                                aria-label="Export table"
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {error ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                        Failed to load forecast navigator. {error}
                    </div>
                ) : !selectedItem ? (
                    <div className="rounded-md border bg-muted/30 p-8 text-center">
                        <p className="text-base font-medium">No forecast values available</p>
                        <p className="text-sm text-muted-foreground mt-1">Run a forecast to populate this page.</p>
                    </div>
                ) : (
                    <>
                        <ForecastTable months={periods.map(formatPeriod)} rowData={rowData} />
                        <ForecastChart data={chartData} />
                    </>
                )}
            </div>
        </div>
    )
}
