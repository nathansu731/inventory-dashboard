import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {AlertTriangle, Calendar, Package, TrendingUp} from "lucide-react";
import {Card} from "@/components/ui/card";
import {ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart";
import {CartesianGrid, Line, LineChart, XAxis, YAxis} from "recharts";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import React from "react";
import {Sku} from "@/components/dashboard/dashboard-data";

type DashboardDetailModalProps = {
    isModalOpen: boolean,
    setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>,
    selectedSku: string | null,
    getSelectedSkuData: () => Sku | null;
}

export const DashboardDetailModal = ({isModalOpen, setIsModalOpen, selectedSku, getSelectedSkuData}: DashboardDetailModalProps) => {
    return (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        {selectedSku} - {getSelectedSkuData()?.name}
                    </DialogTitle>
                </DialogHeader>

                {getSelectedSkuData() && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card className="p-4">
                                <div className="text-sm text-gray-600">Current Stock</div>
                                <div className="text-2xl font-bold">{getSelectedSkuData()?.currentStock}</div>
                            </Card>
                            <Card className="p-4">
                                <div className="text-sm text-gray-600">Reorder Point</div>
                                <div className="text-2xl font-bold">{getSelectedSkuData()?.reorderPoint}</div>
                            </Card>
                            <Card className="p-4">
                                <div className="text-sm text-gray-600">Lead Time</div>
                                <div className="text-2xl font-bold">{getSelectedSkuData()?.leadTime} days</div>
                            </Card>
                            <Card className="p-4">
                                <div className="text-sm text-gray-600">Forecast Accuracy</div>
                                <div className="text-2xl font-bold">{getSelectedSkuData()?.forecastAccuracy}</div>
                            </Card>
                        </div>
                        <Card className="p-4">
                            <h3 className="font-semibold mb-3">Product Information</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-600">Description:</span>
                                    <p className="mt-1">{getSelectedSkuData()?.description}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">Supplier:</span>
                                    <p className="mt-1">{getSelectedSkuData()?.supplier}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">Unit Cost:</span>
                                    <p className="mt-1 font-medium">${getSelectedSkuData()?.unitCost}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">Selling Price:</span>
                                    <p className="mt-1 font-medium">${getSelectedSkuData()?.sellingPrice}</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-4">
                            <h3 className="font-semibold mb-3">Historical Performance</h3>
                            <ChartContainer
                                config={{
                                    sales: {
                                        label: "Actual Sales",
                                        color: "hsl(var(--chart-1))",
                                    },
                                    forecast: {
                                        label: "Forecast",
                                        color: "hsl(var(--chart-2))",
                                    },
                                }}
                                className="h-[200px]"
                            >
                                <LineChart data={getSelectedSkuData()?.historicalData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Line
                                        type="monotone"
                                        dataKey="sales"
                                        stroke="var(--color-sales)"
                                        strokeWidth={2}
                                        dot={{ fill: "var(--color-sales)" }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="forecast"
                                        stroke="var(--color-forecast)"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={{ fill: "var(--color-forecast)" }}
                                    />
                                </LineChart>
                            </ChartContainer>
                        </Card>
                        <Card className="p-4">
                            <h3 className="font-semibold mb-3">Future Forecasts</h3>
                            <div className="space-y-3">
                                {getSelectedSkuData()?.futureForecasts.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <Calendar className="w-4 h-4 text-gray-500" />
                                            <span className="font-medium">{item.month}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-lg font-semibold">{item.forecast} units</span>
                                            <Badge
                                                variant={
                                                    item.confidence > 80 ? "default" : item.confidence > 70 ? "secondary" : "destructive"
                                                }
                                            >
                                                {item.confidence}% confidence
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                        <Card className="p-4">
                            <h3 className="font-semibold mb-3">Alerts & Recommendations</h3>
                            <div className="space-y-3">
                                {getSelectedSkuData()?.alerts.map((alert, index) => (
                                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-lg">
                        {alert.type === "warning" ? "⚠️" : alert.type === "success" ? "✅" : "ℹ️"}
                      </span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{alert.message}</p>
                                            <Badge
                                                variant={
                                                    alert.severity === "high"
                                                        ? "destructive"
                                                        : alert.severity === "medium"
                                                            ? "default"
                                                            : "secondary"
                                                }
                                                className="mt-1"
                                            >
                                                {alert.severity} priority
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                        <div className="flex gap-3 pt-4 border-t">
                            <Button className="flex-1">
                                <Package className="w-4 h-4 mr-2" />
                                Create Reorder
                            </Button>
                            <Button variant="outline" className="flex-1 bg-transparent">
                                <TrendingUp className="w-4 h-4 mr-2" />
                                Adjust Forecast
                            </Button>
                            <Button variant="outline" className="flex-1 bg-transparent">
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Set Alert
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}