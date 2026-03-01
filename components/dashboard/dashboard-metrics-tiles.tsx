import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingDown, TrendingUp } from "lucide-react"

type MetricTile = {
    title: string
    value: string
    change: string
    trend: "up" | "down"
    icon?: React.ComponentType<{ className?: string }>
}

type DashboardMetricsTilesProps = {
    metrics: MetricTile[]
}

export const DashboardMetricsTiles = ({ metrics }: DashboardMetricsTilesProps) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metrics.map((metric, index) => {
                const hasMeaningfulValue = metric.value.trim() !== "" && metric.value.trim() !== "--"
                const hasMeaningfulChange = metric.change.trim() !== ""
                const showTrendRow = hasMeaningfulValue && hasMeaningfulChange

                return (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">{metric.title}</CardTitle>
                            {metric.icon ? <metric.icon className="h-4 w-4 text-gray-400" /> : null}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metric.value}</div>
                            {showTrendRow ? (
                                <div className="flex items-center text-xs text-gray-600">
                                    {metric.trend === "up" ? (
                                        <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                                    ) : (
                                        <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
                                    )}
                                    <span className={metric.trend === "up" ? "text-green-600" : "text-red-600"}>
                                        {metric.change}
                                    </span>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
