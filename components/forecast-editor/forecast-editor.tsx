"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ForecastEditorControlsRow } from "@/components/forecast-editor/forecast-editor-controls-row"
import { ForecastEditorMainContentLeft } from "@/components/forecast-editor/forecast-editor-main-content-left"
import { ForecastEditorMainContentRight } from "@/components/forecast-editor/forecast-editor-main-content-right"
import { fetchForecastResult } from "@/lib/forecasting"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type MonthlyMetric = {
    value: number
    variance: number
    status: "positive" | "negative" | "stable"
}

type MonthlyTotalsResult = {
    totalRevenue?: MonthlyMetric
    newCustomers?: MonthlyMetric
    activeAccounts?: MonthlyMetric
    growthRate?: MonthlyMetric
}

type SkuForecastItem = {
    sku: string
    store: string
    frequency: string
    periods: string[]
    demand: Record<string, number | null>
    forecastBaseline: Record<string, number | null>
    demandAdjustment: Record<string, number | null>
    forecastAdjustment: Record<string, number | null>
    lower80?: Record<string, number | null>
    upper80?: Record<string, number | null>
    lower95?: Record<string, number | null>
    upper95?: Record<string, number | null>
    originalDemand?: Record<string, number | null>
    originalForecastBaseline?: Record<string, number | null>
}

type SkuForecastValues = {
    frequency: string
    items: SkuForecastItem[]
}

type ForecastRow = {
    metric: string
    metricKey: string
    [key: string]: number | string | null
}

const EDITABLE_METRICS = ["demandAdjustment", "forecastAdjustment"]
const AGGREGATION_LEVELS = ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"] as const
type Frequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly"

const normalizeFrequency = (value?: string): Frequency => {
    const lower = (value ?? "").toLowerCase()
    if (lower === "daily") return "daily"
    if (lower === "weekly") return "weekly"
    if (lower === "quarterly") return "quarterly"
    if (lower === "yearly") return "yearly"
    return "monthly"
}

const frequencyToLabel = (value: Frequency): (typeof AGGREGATION_LEVELS)[number] => {
    if (value === "daily") return "Daily"
    if (value === "weekly") return "Weekly"
    if (value === "quarterly") return "Quarterly"
    if (value === "yearly") return "Yearly"
    return "Monthly"
}

const labelToFrequency = (value: string): Frequency => normalizeFrequency(value)

const frequencyRank: Record<Frequency, number> = {
    daily: 0,
    weekly: 1,
    monthly: 2,
    quarterly: 3,
    yearly: 4,
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
        const qy = period.match(/^Q([1-4])[- ]?(\d{4})$/i) ?? period.match(/^(\d{4})[- ]?Q([1-4])$/i)
        if (!qy) return null
        const quarter = Number(qy[1].startsWith("20") ? qy[2] : qy[1])
        const year = Number(qy[1].startsWith("20") ? qy[1] : qy[2])
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

const aggregateRows = (
    rows: ForecastRow[],
    periods: string[],
    fromFrequency: Frequency,
    toFrequency: Frequency
): { periods: string[]; rows: ForecastRow[] } => {
    if (fromFrequency === toFrequency) {
        return { periods, rows }
    }

    const bucketOrder: string[] = []
    const periodToBucket = new Map<string, string>()

    periods.forEach((period) => {
        const parsed = parsePeriodDate(period, fromFrequency)
        const bucket = parsed ? toBucketKey(parsed, toFrequency) : period
        periodToBucket.set(period, bucket)
        if (!bucketOrder.includes(bucket)) bucketOrder.push(bucket)
    })

    const aggregatedRows = rows.map((row) => {
        const next: ForecastRow = {
            metric: row.metric,
            metricKey: row.metricKey,
        }
        const hasNumericByBucket: Record<string, boolean> = {}

        periods.forEach((period) => {
            const bucket = periodToBucket.get(period)
            if (!bucket) return
            const rawValue = row[period]
            if (rawValue === null || rawValue === undefined || rawValue === "") {
                if (!(bucket in next)) next[bucket] = null
                return
            }
            const numericValue = Number(rawValue)
            if (Number.isNaN(numericValue)) {
                if (!(bucket in next)) next[bucket] = null
                return
            }
            const current = Number(next[bucket] ?? 0)
            next[bucket] = current + numericValue
            hasNumericByBucket[bucket] = true
        })

        Object.keys(next).forEach((key) => {
            if (key === "metric" || key === "metricKey") return
            if (!hasNumericByBucket[key]) next[key] = null
        })

        return next
    })

    return { periods: bucketOrder, rows: aggregatedRows }
}

const toEditableAdjustmentMap = (values?: Record<string, number | null>): Record<string, number> => {
    if (!values) return {}
    return Object.entries(values).reduce<Record<string, number>>((acc, [period, value]) => {
        if (value === null || value === undefined || Number.isNaN(Number(value))) {
            acc[period] = 0
        } else {
            acc[period] = Number(value)
        }
        return acc
    }, {})
}

export const ForecastEditor = () => {
    const searchParams = useSearchParams()
    const requestedSku = useMemo(() => searchParams.get("sku")?.trim() ?? "", [searchParams])
    const requestedStore = useMemo(() => searchParams.get("store")?.trim() ?? "", [searchParams])

    const [aggregationType, setAggregationType] = useState<(typeof AGGREGATION_LEVELS)[number]>("Monthly")
    const [editingCell, setEditingCell] = useState<string | null>(null)
    const [editedCells, setEditedCells] = useState<Set<string>>(new Set())
    const [monthColumns, setMonthColumns] = useState<string[]>([])
    const [summaryData, setSummaryData] = useState<MonthlyTotalsResult | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [skuForecastValues, setSkuForecastValues] = useState<SkuForecastValues | null>(null)
    const [selectedStore, setSelectedStore] = useState<string | null>(null)
    const [skuIndex, setSkuIndex] = useState(0)
    const [tempValue, setTempValue] = useState("")
    const [showConfirm, setShowConfirm] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [runMessage, setRunMessage] = useState<string | null>(null)
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})

    const storeGroups = useMemo(() => {
        const groups: Record<string, SkuForecastItem[]> = {}
        if (!skuForecastValues?.items) return groups
        for (const item of skuForecastValues.items) {
            if (!groups[item.store]) groups[item.store] = []
            groups[item.store].push(item)
        }
        Object.values(groups).forEach((items) => items.sort((a, b) => a.sku.localeCompare(b.sku)))
        return groups
    }, [skuForecastValues])

    const stores = useMemo(() => Object.keys(storeGroups).sort(), [storeGroups])

    const currentStore = selectedStore ?? stores[0] ?? null
    const currentSkus = currentStore ? storeGroups[currentStore] || [] : []
    const currentItem = currentSkus[skuIndex] || null

    const [adjustments, setAdjustments] = useState<{
        demandAdjustment: Record<string, number>
        forecastAdjustment: Record<string, number>
    }>({ demandAdjustment: {}, forecastAdjustment: {} })

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            const [monthlyTotals, skuValues] = await Promise.all([
                fetchForecastResult<MonthlyTotalsResult>("/api/get-monthly-totals"),
                fetchForecastResult<SkuForecastValues>("/api/get-sku-forecast-values"),
            ])

            if (monthlyTotals) {
                setSummaryData(monthlyTotals)
            }
            if (skuValues) {
                const items = skuValues.items ?? []
                setSkuForecastValues({ ...skuValues, items })

                const grouped: Record<string, SkuForecastItem[]> = {}
                for (const item of items) {
                    if (!grouped[item.store]) grouped[item.store] = []
                    grouped[item.store].push(item)
                }
                Object.values(grouped).forEach((groupItems) => groupItems.sort((a, b) => a.sku.localeCompare(b.sku)))

                let initialStore = items[0]?.store || null
                let initialIndex = 0

                if (requestedStore && grouped[requestedStore]) {
                    initialStore = requestedStore
                }

                if (requestedSku) {
                    const candidateStore =
                        (initialStore && grouped[initialStore]?.some((item) => item.sku === requestedSku) ? initialStore : null) ??
                        Object.keys(grouped).find((store) => grouped[store].some((item) => item.sku === requestedSku)) ??
                        null

                    if (candidateStore) {
                        initialStore = candidateStore
                        initialIndex = grouped[candidateStore].findIndex((item) => item.sku === requestedSku)
                        if (initialIndex < 0) initialIndex = 0
                    }
                }

                setSelectedStore(initialStore)
                setSkuIndex(initialIndex)
            }
            setIsLoading(false)
        }

        loadData()
    }, [requestedSku, requestedStore])

    const baseFrequency = useMemo(
        () => normalizeFrequency(currentItem?.frequency || skuForecastValues?.frequency || "monthly"),
        [currentItem?.frequency, skuForecastValues?.frequency]
    )

    const availableAggregations = useMemo(
        () => AGGREGATION_LEVELS.filter((label) => frequencyRank[labelToFrequency(label)] >= frequencyRank[baseFrequency]),
        [baseFrequency]
    )

    useEffect(() => {
        if (!currentItem) return
        setAggregationType(frequencyToLabel(baseFrequency))
        setAdjustments({
            demandAdjustment: toEditableAdjustmentMap(currentItem.demandAdjustment),
            forecastAdjustment: toEditableAdjustmentMap(currentItem.forecastAdjustment),
        })
        setMonthColumns(currentItem.periods || [])
        setEditedCells(new Set())
        setEditingCell(null)
        setRunMessage(null)
    }, [currentItem, baseFrequency])

    const formatPeriod = (period: string, frequency: string) => {
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
            const [month, year] = period.split("-")
            const date = new Date(Number(year), Number(month) - 1, 1)
            return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
        }
        if (frequency === "quarterly") return period.replace("-", " ")
        return period
    }

    const forecastValues: ForecastRow[] = useMemo(() => {
        if (!currentItem) return []
        return [
            {
                metric: "Demand",
                metricKey: "demand",
                ...currentItem.demand,
            },
            {
                metric: "Demand Adjustment",
                metricKey: "demandAdjustment",
                ...adjustments.demandAdjustment,
            },
            {
                metric: "Forecast Baseline",
                metricKey: "forecastBaseline",
                ...currentItem.forecastBaseline,
            },
            {
                metric: "Forecast Adjustment",
                metricKey: "forecastAdjustment",
                ...adjustments.forecastAdjustment,
            },
            {
                metric: "Lower 80%",
                metricKey: "lower80",
                ...(currentItem.lower80 || {}),
            },
            {
                metric: "Upper 80%",
                metricKey: "upper80",
                ...(currentItem.upper80 || {}),
            },
        ]
    }, [currentItem, adjustments])

    const aggregatedData = useMemo(
        () => aggregateRows(forecastValues, monthColumns, baseFrequency, labelToFrequency(aggregationType)),
        [forecastValues, monthColumns, baseFrequency, aggregationType]
    )

    const displayMonthColumns = useMemo(() => aggregatedData.periods, [aggregatedData.periods])
    const displayForecastValues = useMemo(() => aggregatedData.rows, [aggregatedData.rows])
    const displayFormattedColumns = useMemo(() => {
        const targetFrequency = labelToFrequency(aggregationType)
        return displayMonthColumns.map((column) => formatPeriod(column, targetFrequency))
    }, [displayMonthColumns, aggregationType])

    useEffect(() => {
        setColumnVisibility((prev) => {
            const next: Record<string, boolean> = {}
            displayMonthColumns.forEach((period) => {
                next[period] = prev[period] ?? true
            })
            return next
        })
    }, [displayMonthColumns])

    const visibleMonthColumns = useMemo(() => {
        return displayMonthColumns.filter((column) => columnVisibility[column] !== false)
    }, [displayMonthColumns, columnVisibility])

    const visibleFormattedColumns = useMemo(() => {
        return displayMonthColumns
            .map((column, index) => ({ column, label: displayFormattedColumns[index] }))
            .filter(({ column }) => columnVisibility[column] !== false)
            .map(({ label }) => label)
    }, [displayMonthColumns, displayFormattedColumns, columnVisibility])

    const handleCellClick = (metricKey: string, period: string, value: number) => {
        const cellKey = `${metricKey}:${period}`
        setEditingCell(cellKey)
        setTempValue(String(value ?? 0))
    }

    const handleCellBlur = (metricKey: string, period: string) => {
        const cellKey = `${metricKey}:${period}`
        const numericValue = Number.parseFloat(tempValue) || 0

        setAdjustments((prev) => {
            const updated = { ...prev }
            if (metricKey === "demandAdjustment") {
                updated.demandAdjustment = { ...prev.demandAdjustment, [period]: numericValue }
            }
            if (metricKey === "forecastAdjustment") {
                updated.forecastAdjustment = { ...prev.forecastAdjustment, [period]: numericValue }
            }
            return updated
        })

        setEditedCells((prev) => new Set([...prev, cellKey]))
        setEditingCell(null)
    }

    const handleKeyPress = (e: React.KeyboardEvent, metricKey: string, period: string) => {
        if (e.key === "Enter") {
            handleCellBlur(metricKey, period)
        }
    }

    const onPrevSku = () => {
        if (currentSkus.length <= 1) return
        setSkuIndex((prev) => (prev - 1 + currentSkus.length) % currentSkus.length)
    }

    const onNextSku = () => {
        if (currentSkus.length <= 1) return
        setSkuIndex((prev) => (prev + 1) % currentSkus.length)
    }

    const buildAdjustmentPayload = () => {
        if (!currentItem) return null
        return {
            type: "forecast_adjustments",
            sku: currentItem.sku,
            store: currentItem.store,
            frequency: currentItem.frequency,
            periods: monthColumns,
            adjustments: {
                demandAdjustment: adjustments.demandAdjustment,
                forecastAdjustment: adjustments.forecastAdjustment,
            },
            original: {
                demandAdjustment: currentItem.demandAdjustment,
                forecastAdjustment: currentItem.forecastAdjustment,
            },
        }
    }

    const saveAdjustments = async () => {
        if (!currentItem) return
        const payload = buildAdjustmentPayload()
        if (!payload) return

        setIsSaving(true)
        setRunMessage(null)

        try {
            const filename = `forecast-adjustments-${currentItem.sku}-${Date.now()}.json`
            const uploadRes = await fetch("/api/upload-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filename,
                    contentType: "application/json",
                }),
            })

            if (!uploadRes.ok) {
                setRunMessage("Failed to get upload URL")
                setIsSaving(false)
                return
            }

            const { uploadUrl, s3Key, s3Bucket } = await uploadRes.json()
            const putRes = await fetch(uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!putRes.ok) {
                setRunMessage("Failed to upload adjustments")
                setIsSaving(false)
                return
            }

            const runRes = await fetch("/api/forecast/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    s3Bucket,
                    s3Key,
                    adjustmentsKey: s3Key,
                    sku: currentItem.sku,
                    store: currentItem.store,
                    frequency: currentItem.frequency,
                    originalFilename: filename,
                }),
            })

            const runJson = await runRes.json()
            if (!runRes.ok || runJson?.status === "error") {
                setRunMessage("Failed to start adjustment run")
                setIsSaving(false)
                return
            }

            setRunMessage("Run in progress. Check notifications for status.")
        } catch {
            setRunMessage("Unexpected error while saving adjustments")
        } finally {
            setIsSaving(false)
            setShowConfirm(false)
        }
    }

    const handleExport = () => {
        const columnsToExport = visibleMonthColumns.length > 0 ? visibleMonthColumns : displayMonthColumns
        const headerLabels = columnsToExport.map((column) => {
            const index = displayMonthColumns.indexOf(column)
            return displayFormattedColumns[index] ?? column
        })

        if (columnsToExport.length === 0 || displayForecastValues.length === 0) return

        const headers = ["Metric", ...headerLabels]
        const rows = displayForecastValues.map((row) => [
            row.metric,
            ...columnsToExport.map((column) => {
                const value = row[column]
                return value === null || value === undefined || value === "" ? "--" : String(value)
            }),
        ])
        const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.setAttribute("download", `forecast-editor-${currentItem?.sku ?? "export"}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-[2000px] mx-auto p-5 min-w-0 space-y-5">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Forecast Editor</h1>
                    <p className="text-muted-foreground mt-1">Review forecast values, apply adjustments, and rerun selected SKU scenarios.</p>
                </div>
                <div className="rounded-md border bg-background">
                    <ForecastEditorControlsRow
                        aggregationType={aggregationType}
                        setAggregationType={setAggregationType}
                        availableAggregations={availableAggregations}
                        storeLabel={currentItem?.store ?? null}
                        skuLabel={currentItem?.sku ?? null}
                        skuIndex={skuIndex}
                        skuCount={currentSkus.length}
                        onPrevSku={onPrevSku}
                        onNextSku={onNextSku}
                        onSave={() => setShowConfirm(true)}
                        isSaving={isSaving}
                        disableSave={labelToFrequency(aggregationType) !== baseFrequency}
                        monthColumns={displayMonthColumns}
                        formattedColumns={displayFormattedColumns}
                        columnVisibility={columnVisibility}
                        setColumnVisibility={setColumnVisibility}
                        onExport={handleExport}
                    />
                    <div className="flex overflow-x-auto">
                        <ForecastEditorMainContentLeft summaryData={summaryData} isLoading={isLoading}/>
                        <ForecastEditorMainContentRight
                            forecastValues={displayForecastValues}
                            monthColumns={visibleMonthColumns}
                            formattedColumns={visibleFormattedColumns}
                            editingCell={editingCell}
                            editedCells={editedCells}
                            handleCellClick={(rowIndex, period) => {
                                const row = displayForecastValues[rowIndex]
                                const value = Number(row?.[period] ?? 0)
                                handleCellClick(row.metricKey, period, value)
                            }}
                            tempValue={tempValue}
                            setTempValue={setTempValue}
                            handleCellBlur={(rowIndex, period) => {
                                const row = displayForecastValues[rowIndex]
                                handleCellBlur(row.metricKey, period)
                            }}
                            handleKeyPress={(e, rowIndex, period) => {
                                const row = displayForecastValues[rowIndex]
                                handleKeyPress(e, row.metricKey, period)
                            }}
                            isLoading={isLoading}
                            editableMetrics={labelToFrequency(aggregationType) === baseFrequency ? EDITABLE_METRICS : []}
                        />
                    </div>
                </div>
                {runMessage && (
                    <div className="text-sm text-muted-foreground">
                        {runMessage}
                    </div>
                )}
            </div>

            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Save adjustments and recalculate?</DialogTitle>
                    </DialogHeader>
                    <div className="text-sm text-muted-foreground">
                        This will create a new forecast run using your adjustments for the selected SKU and store.
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setShowConfirm(false)}>
                            Cancel
                        </Button>
                        <Button onClick={saveAdjustments} disabled={isSaving}>
                            {isSaving ? "Starting..." : "Confirm & Run"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
