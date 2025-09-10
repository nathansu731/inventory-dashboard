import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {BarChart3, Package, Search} from "lucide-react";
import {ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart";
import {CartesianGrid, Line, LineChart, XAxis, YAxis} from "recharts";
import {forecastData, skuTableData} from "@/components/dashboard/dashboard-data";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Badge} from "@/components/ui/badge";
import React from "react";

type DashboardChartAndTableProps = {
    viewMode: "chart" | "table",
    setViewMode: React.Dispatch<React.SetStateAction<"chart" | "table">>,
    searchTerm: string,
    setSearchTerm: React.Dispatch<React.SetStateAction<string>>,
    selectedCategory: string,
    setSelectedCategory: React.Dispatch<React.SetStateAction<string>>,
    openSkuModal: (sku: string) => void,
    getRiskBadgeColor: (risk: string) => "destructive" | "default" | "secondary";
}

export const DashboardChartAndTable = ({viewMode, setViewMode, searchTerm, setSearchTerm, selectedCategory, setSelectedCategory, openSkuModal, getRiskBadgeColor}: DashboardChartAndTableProps) => {
    return (
        <Card className="mb-6">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Demand Forecast Overview</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">Historical vs forecasted demand trends</p>
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
                            actual: {
                                label: "Actual",
                                color: "hsl(var(--chart-1))",
                            },
                            forecast: {
                                label: "Forecast",
                                color: "hsl(var(--chart-2))",
                            },
                            demand: {
                                label: "Demand",
                                color: "hsl(var(--chart-3))",
                            },
                        }}
                        className="h-[400px] w-full"
                    >
                        <LineChart data={forecastData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line
                                type="monotone"
                                dataKey="actual"
                                stroke="var(--color-actual)"
                                strokeWidth={2}
                                dot={{ fill: "var(--color-actual)" }}
                            />
                            <Line
                                type="monotone"
                                dataKey="forecast"
                                stroke="var(--color-forecast)"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={{ fill: "var(--color-forecast)" }}
                            />
                            <Line
                                type="monotone"
                                dataKey="demand"
                                stroke="var(--color-demand)"
                                strokeWidth={2}
                                dot={{ fill: "var(--color-demand)" }}
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
                                    <SelectItem value="all">All Categories</SelectItem>
                                    <SelectItem value="electronics">Electronics</SelectItem>
                                    <SelectItem value="accessories">Accessories</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Current Stock</TableHead>
                                    <TableHead>Forecast Demand</TableHead>
                                    <TableHead>Risk Level</TableHead>
                                    <TableHead>Accuracy</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {skuTableData.map((item) => (
                                    <TableRow
                                        key={item.sku}
                                        className="cursor-pointer hover:bg-gray-50"
                                        onClick={() => openSkuModal(item.sku)}
                                    >
                                        <TableCell className="font-medium">{item.sku}</TableCell>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell>{item.category}</TableCell>
                                        <TableCell>{item.currentStock.toLocaleString()}</TableCell>
                                        <TableCell>{item.forecastDemand.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Badge variant={getRiskBadgeColor(item.riskLevel)}>{item.riskLevel}</Badge>
                                        </TableCell>
                                        <TableCell>{item.accuracy}</TableCell>
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