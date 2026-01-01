"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    TrendingDown,
    TrendingUp,
    Package,
    AlertTriangle,
    Calendar,
} from "lucide-react"

type MonthlyMetric = {
    value: number
    variance: number
    status: "positive" | "negative" | "stable"
}

type MonthlyTotalsResult = {
    totalSKUs?: MonthlyMetric
    forecastAccuracy?: MonthlyMetric
    OutOfStockRisk?: MonthlyMetric
    AvgLeadTime?: MonthlyMetric
}

export const DashboardMetricsTiles = () => {
    const [data, setData] = useState<MonthlyTotalsResult | null>(null)

    useEffect(() => {
        const loadMonthlyTotals = async () => {
            const res = await fetch("/api/get-monthly-totals")
            if (!res.ok) return

            const json = await res.json()

            const result =
                typeof json.result === "string"
                    ? JSON.parse(json.result)
                    : json.result

            setData(result)
        }

        loadMonthlyTotals()
    }, [])

    const metricsData = [
        {
            title: "Total SKUs",
            value: data?.totalSKUs?.value?.toLocaleString() ?? "--",
            change: `${((data?.totalSKUs?.variance ?? 0) * 100).toFixed(1)}%`,
            trend: (data?.totalSKUs?.variance ?? 0) >= 0 ? "up" : "down",
            icon: Package,
        },
        {
            title: "Forecast Accuracy",
            value: data?.forecastAccuracy?.value?.toLocaleString() ?? "--",
            change: `${((data?.forecastAccuracy?.variance ?? 0) * 100).toFixed(1)}%`,
            trend: (data?.forecastAccuracy?.variance ?? 0) >= 0 ? "up" : "down",
            icon: TrendingUp,
        },
        {
            title: "Out of Stock Risk",
            value: data?.OutOfStockRisk?.value?.toLocaleString() ?? "--",
            change: `${((data?.OutOfStockRisk?.variance ?? 0) * 100).toFixed(1)}%`,
            trend: (data?.OutOfStockRisk?.variance ?? 0) >= 0 ? "up" : "down",
            icon: AlertTriangle,
        },
        {
            title: "Avg Lead Time",
            value: data?.AvgLeadTime?.value?.toLocaleString() ?? "--",
            change: `${((data?.AvgLeadTime?.variance ?? 0) * 100).toFixed(1)}%`,
            trend: (data?.AvgLeadTime?.variance ?? 0) >= 0 ? "up" : "down",
            icon: Calendar,
        },
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metricsData.map((metric, index) => (
                <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            {metric.title}
                        </CardTitle>
                        <metric.icon className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metric.value}</div>
                        <div className="flex items-center text-xs text-gray-600">
                            {metric.trend === "up" ? (
                                <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                            ) : (
                                <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
                            )}
                            <span
                                className={
                                    metric.trend === "up"
                                        ? "text-green-600"
                                        : "text-red-600"
                                }
                            >
                                {metric.change}
                            </span>
                            <span className="ml-1">from last month</span>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}