"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
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
    demand: Record<string, number>
    forecastBaseline: Record<string, number>
    demandAdjustment: Record<string, number>
    forecastAdjustment: Record<string, number>
    lower80?: Record<string, number>
    upper80?: Record<string, number>
    lower95?: Record<string, number>
    upper95?: Record<string, number>
    originalDemand?: Record<string, number>
    originalForecastBaseline?: Record<string, number>
}

type SkuForecastValues = {
    frequency: string
    items: SkuForecastItem[]
}

type ForecastRow = {
    metric: string
    metricKey: string
    [key: string]: number | string
}

const EDITABLE_METRICS = ["demandAdjustment", "forecastAdjustment"]

export const ForecastEditor = () => {
    const [aggregationType, setAggregationType] = useState("Monthly")
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
                setSkuForecastValues(skuValues)
                const initialStore = skuValues.items?.[0]?.store || null
                setSelectedStore(initialStore)
                setSkuIndex(0)
            }
            setIsLoading(false)
        }

        loadData()
    }, [])

    useEffect(() => {
        if (!currentItem) return
        const freqLabel = currentItem.frequency ? currentItem.frequency.charAt(0).toUpperCase() + currentItem.frequency.slice(1) : "Monthly"
        setAggregationType(freqLabel)
        setAdjustments({
            demandAdjustment: { ...(currentItem.demandAdjustment || {}) },
            forecastAdjustment: { ...(currentItem.forecastAdjustment || {}) },
        })
        setMonthColumns(currentItem.periods || [])
        setEditedCells(new Set())
        setEditingCell(null)
        setRunMessage(null)
    }, [currentItem])

    const formatPeriod = (period: string, frequency: string) => {
        if (frequency === "daily" || frequency === "weekly") {
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

    const formattedColumns = useMemo(() => {
        const freq = currentItem?.frequency || skuForecastValues?.frequency || "monthly"
        return monthColumns.map((column) => formatPeriod(column, freq))
    }, [monthColumns, currentItem?.frequency, skuForecastValues?.frequency])

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

    return (
        <div className="flex flex-col h-screen bg-background">
            <div className="border-b bg-background px-6 py-4">
                <h1 className="text-2xl font-semibold text-foreground">Forecast Editor</h1>
            </div>
            <ForecastEditorControlsRow
                aggregationType={aggregationType}
                setAggregationType={setAggregationType}
                storeLabel={currentItem?.store ?? null}
                skuLabel={currentItem?.sku ?? null}
                skuIndex={skuIndex}
                skuCount={currentSkus.length}
                onPrevSku={onPrevSku}
                onNextSku={onNextSku}
                onSave={() => setShowConfirm(true)}
                isSaving={isSaving}
            />
            <div className="flex flex-1 overflow-x-auto">
                <ForecastEditorMainContentLeft summaryData={summaryData} isLoading={isLoading}/>
                <ForecastEditorMainContentRight
                    forecastValues={forecastValues}
                    monthColumns={monthColumns}
                    formattedColumns={formattedColumns}
                    editingCell={editingCell}
                    editedCells={editedCells}
                    handleCellClick={(rowIndex, period) => {
                        const row = forecastValues[rowIndex]
                        const value = Number(row?.[period] ?? 0)
                        handleCellClick(row.metricKey, period, value)
                    }}
                    tempValue={tempValue}
                    setTempValue={setTempValue}
                    handleCellBlur={(rowIndex, period) => {
                        const row = forecastValues[rowIndex]
                        handleCellBlur(row.metricKey, period)
                    }}
                    handleKeyPress={(e, rowIndex, period) => {
                        const row = forecastValues[rowIndex]
                        handleKeyPress(e, row.metricKey, period)
                    }}
                    isLoading={isLoading}
                    editableMetrics={EDITABLE_METRICS}
                />
            </div>
            {runMessage && (
                <div className="px-6 pb-6 text-sm text-muted-foreground">
                    {runMessage}
                </div>
            )}

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
