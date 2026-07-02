import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AlertTriangle, Package, TrendingUp } from "lucide-react"
import type { ReplenishmentException } from "@/lib/replenishment-exceptions"

type DashboardAlert = {
    type: string
    message: string
    time: string
}

type DashboardRightPanelProps = {
    getAlertIcon: (type: string) => "🔴" | "🟡" | "🔵" | "ℹ️"
    alerts: DashboardAlert[]
    exceptions: ReplenishmentException[]
    categories: string[]
    timeRange: "7days" | "14days" | "21days" | "30days"
    setTimeRange: React.Dispatch<React.SetStateAction<"7days" | "14days" | "21days" | "30days">>
    selectedCategory: string
    setSelectedCategory: React.Dispatch<React.SetStateAction<string>>
    riskLevelFilter: "all" | "high" | "medium" | "low"
    setRiskLevelFilter: React.Dispatch<React.SetStateAction<"all" | "high" | "medium" | "low">>
}

export const DashboardRightPanel = ({
    getAlertIcon,
    alerts,
    exceptions,
    categories,
    timeRange,
    setTimeRange,
    selectedCategory,
    setSelectedCategory,
    riskLevelFilter,
    setRiskLevelFilter,
}: DashboardRightPanelProps) => {
    void alerts

    return (
        <div className="w-full lg:w-80 bg-white min-[1300px]:border-l min-[1300px]:border-gray-200 p-6">
            <Tabs defaultValue="filters" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="filters">Filters</TabsTrigger>
                    <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
                </TabsList>

                <TabsContent value="filters" className="space-y-6">
                    <div>
                        <Label className="text-sm font-medium">Forecast Horizon</Label>
                        <Select value={timeRange} onValueChange={(v: "7days" | "14days" | "21days" | "30days") => setTimeRange(v)}>
                            <SelectTrigger className="mt-2">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7days">Next 7 Days</SelectItem>
                                <SelectItem value="14days">Next 14 Days</SelectItem>
                                <SelectItem value="21days">Next 21 Days</SelectItem>
                                <SelectItem value="30days">Next 30 Days</SelectItem>
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
                            setTimeRange("30days")
                            setSelectedCategory("all")
                            setRiskLevelFilter("all")
                        }}
                    >
                        Reset Filters
                    </Button>
                </TabsContent>

                <TabsContent value="exceptions" className="space-y-4">
                    <div className="space-y-3">
                        {exceptions.length === 0 ? (
                            <Card className="p-4 bg-muted/30">
                                <p className="text-sm font-medium text-gray-900">No active exceptions</p>
                                <p className="text-xs text-gray-500 mt-1">Exceptions will appear here when forecast, replenishment, or run issues need attention.</p>
                            </Card>
                        ) : (
                            exceptions.map((exception, index) => (
                                <Card key={index} className="p-3">
                                    <div className="flex items-start gap-3">
                                        <span className="text-lg">{getAlertIcon(exception.severity)}</span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">{exception.title}</p>
                                            <p className="text-xs text-gray-500 mt-1">{exception.detail}</p>
                                            {exception.actionHref && exception.actionLabel ? (
                                                <Button variant="link" size="sm" className="mt-1 h-auto px-0 text-xs" asChild>
                                                    <Link href={exception.actionHref}>{exception.actionLabel}</Link>
                                                </Button>
                                            ) : null}
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
                                    View Run Notifications
                                </Link>
                            </Button>
                            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" asChild>
                                <Link href="/kpis">
                                    <TrendingUp className="w-4 h-4 mr-2" />
                                    Open KPI Summary
                                </Link>
                            </Button>
                            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" asChild>
                                <Link href="/replenishments">
                                    <Package className="w-4 h-4 mr-2" />
                                    Open Replenishments
                                </Link>
                            </Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
