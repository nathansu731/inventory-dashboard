import {metricsData} from "@/components/dashboard/dashboard-data";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {TrendingDown, TrendingUp} from "lucide-react";

export const DashboardMetricsTiles = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metricsData.map((metric, index) => (
                <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">{metric.title}</CardTitle>
                        <metric.icon className="h-4 w-4 text-gray-400"/>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metric.value}</div>
                        <div className="flex items-center text-xs text-gray-600">
                            {metric.trend === "up" ? (
                                <TrendingUp className="w-3 h-3 mr-1 text-green-500"/>
                            ) : (
                                <TrendingDown className="w-3 h-3 mr-1 text-red-500"/>
                            )}
                            <span
                                className={metric.trend === "up" ? "text-green-600" : "text-red-600"}>{metric.change}</span>
                            <span className="ml-1">from last month</span>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}