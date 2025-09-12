"use client"

import {rowData} from "@/components/forecast-navigator/row-data";
import {NavigatorRow} from "@/components/forecast-navigator/navigator-row";
import {ControlRow} from "@/components/forecast-navigator/control-row";
import {ForecastTable} from "@/components/forecast-navigator/forecast-table";
import {ForecastChart} from "@/components/forecast-navigator/forecast-chart";

export const ForecastNavigator = () => {
    const generateMonths = () => {
        const months = []
        const currentDate = new Date()

        for (let i = 0; i < 12; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
            const month = (date.getMonth() + 1).toString()
            const year = date.getFullYear().toString()
            months.push(`${month}/${year}`)
        }

        return months
    }

    const months = generateMonths()

    const chartData = months
        .map((month, index) => ({
            month,
            demand: Number.parseInt(rowData.find((row) => row.label === "Demand")?.values[index] || "0"),
            forecastBaseline: Number.parseInt(rowData.find((row) => row.label === "Forecast Baseline")?.values[index] || "0"),
        }))
        .reverse()

    return (
        <div className="container mx-auto py-8 px-4">
                <div className="mx-auto px-6 py-6">
                    <h1 className="text-2xl font-bold text-gray-900">Forecast Navigator</h1>
                </div>
                <div className="mx-auto px-6 py-6 space-y-4">
                    <NavigatorRow/>
                    <ControlRow/>
                    <ForecastTable months={months}/>
                    <ForecastChart data={chartData}/>
                </div>
        </div>
    )
}