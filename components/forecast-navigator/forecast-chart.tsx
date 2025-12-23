import {
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    ResponsiveContainer
} from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import {ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart";

type ForecastChartProps = {
    data: {
        month: string
        demand: number
        forecastBaseline: number
    }[]
}

export const ForecastChart = ({ data }: ForecastChartProps) => {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Demand vs Forecast Baseline
                    </h3>
                </div>
                <ChartContainer
                    config={{
                        demand: {
                            label: "Demand",
                            color: "hsl(var(--chart-1))",
                        },
                        forecastBaseline: {
                            label: "Forecast Baseline",
                            color: "hsl(var(--chart-2))",
                        },
                    }}
                    className="h-[300px] w-full"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 12 }}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line
                                type="monotone"
                                dataKey="demand"
                                stroke="#3b82f6"
                                name="Demand"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="forecastBaseline"
                                stroke="#f97316"
                                name="Forecast Baseline"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}