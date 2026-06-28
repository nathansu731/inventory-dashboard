import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, Package, Search } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import React from "react"

type ForecastChartRow = {
    period: string
    forecast: number
    lower80: number
    upper80: number
    seriesCount: number
}

type SkuTableRow = {
    seriesKey: string
    sku: string
    store: string
    abcClass: string
    forecastMethod: string
    forecastDemand: number
    riskLevel: string
}

type DashboardChartAndTableProps = {
    viewMode: "chart" | "table",
    setViewMode: React.Dispatch<React.SetStateAction<"chart" | "table">>,
    searchTerm: string,
    setSearchTerm: React.Dispatch<React.SetStateAction<string>>,
    selectedCategory: string,
    setSelectedCategory: React.Dispatch<React.SetStateAction<string>>,
    openSkuModal: (seriesKey: string) => void,
    getRiskBadgeColor: (risk: string) => "destructive" | "default" | "secondary";
    chartData: ForecastChartRow[]
    tableData: SkuTableRow[]
    categories: string[]
}

export const DashboardChartAndTable = ({
    viewMode,
    setViewMode,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    openSkuModal,
    getRiskBadgeColor,
    chartData,
    tableData,
    categories,
}: DashboardChartAndTableProps) => {
    return (
        <Card className="mb-6">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Demand Forecast Overview</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">30-day aggregated forecast horizon with uncertainty bands</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={viewMode === "chart" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewMode("chart")}
                        >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Chart
                        </Button>
                        <Button
                            variant={viewMode === "table" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewMode("table")}
                        >
                            <Package className="w-4 h-4 mr-2" />
                            Table
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {viewMode === "chart" ? (
                    <ChartContainer
                        config={{
                            forecast: {
                                label: "Forecast",
                                color: "#339CFF",
                            },
                            lower80: {
                                label: "Lower 80%",
                                color: "#93C5FD",
                            },
                            upper80: {
                                label: "Upper 80%",
                                color: "#1D4ED8",
                            },
                            seriesCount: {
                                label: "Series Count",
                                color: "#0F172A",
                            },
                        }}
                        className="h-[400px] w-full"
                    >
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line
                                type="monotone"
                                dataKey="forecast"
                                stroke="var(--color-forecast)"
                                strokeWidth={2}
                                dot={{ fill: "var(--color-forecast)" }}
                            />
                            <Line
                                type="monotone"
                                dataKey="lower80"
                                stroke="var(--color-lower80)"
                                strokeWidth={1.5}
                                strokeDasharray="4 4"
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="upper80"
                                stroke="var(--color-upper80)"
                                strokeWidth={1.5}
                                strokeDasharray="4 4"
                                dot={false}
                            />
                        </LineChart>
                    </ChartContainer>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Search SKUs..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Stores</SelectItem>
                                    {categories.map((category) => (
                                        <SelectItem key={category} value={category}>
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Store</TableHead>
                                    <TableHead>ABC Class</TableHead>
                                    <TableHead>Forecast Method</TableHead>
                                    <TableHead>30d Forecast</TableHead>
                                    <TableHead>Risk Level</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tableData.map((item) => (
                                    <TableRow
                                        key={item.seriesKey}
                                        className="cursor-pointer hover:bg-gray-50"
                                        onClick={() => openSkuModal(item.seriesKey)}
                                    >
                                        <TableCell className="font-medium">{item.sku}</TableCell>
                                        <TableCell>{item.store}</TableCell>
                                        <TableCell>{item.abcClass}</TableCell>
                                        <TableCell>{item.forecastMethod}</TableCell>
                                        <TableCell>{item.forecastDemand.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Badge variant={getRiskBadgeColor(item.riskLevel)}>{item.riskLevel}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
