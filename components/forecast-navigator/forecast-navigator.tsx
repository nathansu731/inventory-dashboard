"use client"

import { useEffect, useMemo, useState } from "react"
import { NavigatorRow } from "@/components/forecast-navigator/navigator-row"
import { ControlRow } from "@/components/forecast-navigator/control-row"
import { ForecastTable } from "@/components/forecast-navigator/forecast-table"
import { ForecastChart } from "@/components/forecast-navigator/forecast-chart"

type RowData = {
    label: string
    values: string[]
}

const LABEL_MAP: Record<string, string> = {
    budget: "Budget",
    demand: "Demand",
    demandAdjustment: "Demand Adjustment",
    forecastBaseline: "Forecast Baseline",
    forecastAdjustment: "Forecast Adjustment",
    previousForecasts: "Previous Forecasts",
    variance: "Variance",
    revenue: "Revenue",
}

export const ForecastNavigator = () => {
    const [rowData, setRowData] = useState<RowData[]>([])

    const months = useMemo(() => {
        const result: string[] = []
        const currentDate = new Date()

        for (let i = 0; i < 12; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
            result.push(`${date.getMonth() + 1}/${date.getFullYear()}`)
        }

        return result
    }, [])

    useEffect(() => {
        const loadForecasts = async () => {
            const res = await fetch("/api/get-sku-forecasts")
            if (!res.ok) return

            const { result } = await res.json()
            const data = typeof result === "string" ? JSON.parse(result) : result

            const rows: RowData[] = Object.entries(LABEL_MAP).map(([key, label]) => ({
                label,
                values: months.map((m) => {
                    const [month, year] = m.split("/")
                    const apiKey = `${month.padStart(2, "0")}-${year}`
                    return String(data[key]?.[apiKey] ?? "0")
                }),
            }))

            setRowData(rows)
        }

        loadForecasts()
    }, [months])

    const demandRow = rowData.find(r => r.label === "Demand")
    const baselineRow = rowData.find(r => r.label === "Forecast Baseline")

    const chartData = months
        .map((month, index) => ({
            month,
            demand: Number(demandRow?.values[index] ?? 0),
            forecastBaseline: Number(baselineRow?.values[index] ?? 0),
        }))
        .reverse()

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mx-auto px-6 py-6">
                <h1 className="text-2xl font-bold text-gray-900">Forecast Navigator</h1>
            </div>

            <div className="mx-auto px-6 py-6 space-y-4">
                <NavigatorRow />
                <ControlRow />
                <ForecastTable months={months} rowData={rowData} />
                <ForecastChart data={chartData} />
            </div>
        </div>
    )
}