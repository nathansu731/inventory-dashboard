import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AlertTriangle, Package, TrendingUp } from "lucide-react"

type DashboardAlert = {
    type: string
    message: string
    time: string
}

type DashboardRightPanelProps = {
    getAlertIcon: (type: string) => "🔴" | "🟡" | "🔵" | "ℹ️"
    alerts: DashboardAlert[]
    categories: string[]
    timeRange: "1month" | "3months" | "6months" | "1year"
    setTimeRange: React.Dispatch<React.SetStateAction<"1month" | "3months" | "6months" | "1year">>
    selectedCategory: string
    setSelectedCategory: React.Dispatch<React.SetStateAction<string>>
    riskLevelFilter: "all" | "high" | "medium" | "low"
    setRiskLevelFilter: React.Dispatch<React.SetStateAction<"all" | "high" | "medium" | "low">>
}

export const DashboardRightPanel = ({
    getAlertIcon,
    alerts,
    categories,
    timeRange,
    setTimeRange,
    selectedCategory,
    setSelectedCategory,
    riskLevelFilter,
    setRiskLevelFilter,
}: DashboardRightPanelProps) => {
    return (
        <div className="w-full lg:w-80 bg-white min-[1300px]:border-l min-[1300px]:border-gray-200 p-6">
            <Tabs defaultValue="filters" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="filters">Filters</TabsTrigger>
                    <TabsTrigger value="alerts">Alerts</TabsTrigger>
                </TabsList>

                <TabsContent value="filters" className="space-y-6">
                    <div>
                        <Label className="text-sm font-medium">Time Range</Label>
                        <Select value={timeRange} onValueChange={(v: "1month" | "3months" | "6months" | "1year") => setTimeRange(v)}>
                            <SelectTrigger className="mt-2">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1month">Last Month</SelectItem>
                                <SelectItem value="3months">Last 3 Months</SelectItem>
                                <SelectItem value="6months">Last 6 Months</SelectItem>
                                <SelectItem value="1year">Last Year</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label className="text-sm font-medium">Store</Label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="mt-2">
                                <SelectValue />
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

                    <div>
                        <Label className="text-sm font-medium">Risk Level</Label>
                        <Select value={riskLevelFilter} onValueChange={(v: "all" | "high" | "medium" | "low") => setRiskLevelFilter(v)}>
                            <SelectTrigger className="mt-2">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Risk Levels</SelectItem>
                                <SelectItem value="high">High Risk</SelectItem>
                                <SelectItem value="medium">Medium Risk</SelectItem>
                                <SelectItem value="low">Low Risk</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                            setTimeRange("3months")
                            setSelectedCategory("all")
                            setRiskLevelFilter("all")
                        }}
                    >
                        Reset Filters
                    </Button>
                </TabsContent>

                <TabsContent value="alerts" className="space-y-4">
                    <div className="space-y-3">
                        {alerts.length === 0 ? (
                            <Card className="p-4 bg-muted/30">
                                <p className="text-sm font-medium text-gray-900">No recent alerts</p>
                                <p className="text-xs text-gray-500 mt-1">Alerts will appear here when runs are created and updated.</p>
                            </Card>
                        ) : (
                            alerts.map((alert, index) => (
                                <Card key={index} className="p-3">
                                    <div className="flex items-start gap-3">
                                        <span className="text-lg">{getAlertIcon(alert.type)}</span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                                            <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                    <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
                        <div className="space-y-2">
                            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" asChild>
                                <Link href="/notifications">
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                    View All Alerts
                                </Link>
                            </Button>
                            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" asChild>
                                <Link href="/kpis">
                                    <TrendingUp className="w-4 h-4 mr-2" />
                                    Accuracy Report
                                </Link>
                            </Button>
                            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" asChild>
                                <Link href="/forecasts/forecasting-summary">
                                    <Package className="w-4 h-4 mr-2" />
                                    Reorder Suggestions
                                </Link>
                            </Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
