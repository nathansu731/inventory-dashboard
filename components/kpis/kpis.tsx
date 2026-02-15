"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { KpisControlsRow } from "@/components/kpis/kpis-controls-row"
import { KpisMainContentLeft } from "@/components/kpis/kpis-main-content-left"
import { KpisMainContentRight } from "@/components/kpis/kpis-main-content-right"
import { fetchForecastResult, formatMonthKey, sortMonthKeys } from "@/lib/forecasting"

type SkuMetadata = {
    store: string
    skuDesc: string
    forecastMethod: string
    ABCclass: string
    ABCpercentage: number
    isApproved: boolean
}

type MonthlyForecasts = Record<string, Record<string, number>>

type KpiRow = {
    sku: string
    store: string
    abcClass: string
    forecastMethod: string
}

type ForecastRow = {
    metric: string
    [key: string]: number | string
}

const KPI_METRICS = ["demand", "forecastBaseline", "variance"]
const KPI_LABELS: Record<string, string> = {
    demand: "Demand",
    forecastBaseline: "Forecast Baseline",
    variance: "Variance",
}

export const Kpis = () => {
    const [aggregationType, setAggregationType] = useState("Monthly")
    const [unitsType, setUnitsType] = useState("USD")
    const [kpiRows, setKpiRows] = useState<KpiRow[]>([])
    const [forecastRows, setForecastRows] = useState<ForecastRow[]>([])
    const [monthColumns, setMonthColumns] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            const [metadata, monthlyForecasts] = await Promise.all([
                fetchForecastResult<Record<string, SkuMetadata>>("/api/get-skus-metadata"),
                fetchForecastResult<MonthlyForecasts>("/api/get-sku-forecasts"),
            ])

            if (metadata) {
                const rows: KpiRow[] = Object.entries(metadata).map(([sku, meta]) => ({
                    sku,
                    store: meta.store,
                    abcClass: meta.ABCclass,
                    forecastMethod: meta.forecastMethod,
                }))
                setKpiRows(rows)
            }

            if (monthlyForecasts) {
                const firstMetric = KPI_METRICS.find((key) => monthlyForecasts[key]) ?? Object.keys(monthlyForecasts)[0]
                const rawMonthKeys = firstMetric ? Object.keys(monthlyForecasts[firstMetric]) : []
                const monthKeys = sortMonthKeys(rawMonthKeys.filter((key) => key !== "average"))
                const columns = [...monthKeys, "average"]

                const rows: ForecastRow[] = KPI_METRICS.filter((key) => monthlyForecasts[key]).map((key) => ({
                    metric: KPI_LABELS[key] ?? key,
                    ...monthlyForecasts[key],
                }))

                setMonthColumns(columns)
                setForecastRows(rows)
            }

            setIsLoading(false)
        }

        loadData()
    }, [])

    const formattedColumns = useMemo(
        () => monthColumns.map((column) => (column === "average" ? "Avg" : formatMonthKey(column))),
        [monthColumns]
    )

    return (
        <div className="flex flex-col h-screen bg-background">
            <div className="border-b bg-background px-6 py-4">
                <h1 className="text-2xl font-semibold text-foreground">KPIs</h1>
            </div>
            <KpisControlsRow aggregationType={aggregationType} setAggregationType={setAggregationType} unitsType={unitsType} setUnitsType={setUnitsType}/>
            <div className="flex flex-1 overflow-x-auto">
                <KpisMainContentLeft rows={kpiRows} isLoading={isLoading}/>
                <KpisMainContentRight
                    forecastValues={forecastRows}
                    monthColumns={monthColumns}
                    formattedColumns={formattedColumns}
                    isLoading={isLoading}
                />
            </div>
        </div>
    )
}
