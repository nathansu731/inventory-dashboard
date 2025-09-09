import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {alerts} from "@/components/dashboard/dashboard-data";
import {Card} from "@/components/ui/card";
import {AlertTriangle, Package, TrendingUp} from "lucide-react";
import {useState} from "react";

type DashboardRightPanelProps = {
    getAlertIcon: (type: string) => "🔴" | "🟡" | "🔵" | "ℹ️",
}

export const DashboardRightPanel = ({getAlertIcon}: DashboardRightPanelProps) => {
    const [value, setValue] = useState(70);
    return (
        <div className="w-full md:w-80 bg-white border-l border-gray-200 p-6">
            <Tabs defaultValue="filters" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="filters">Filters</TabsTrigger>
                    <TabsTrigger value="alerts">Alerts</TabsTrigger>
                </TabsList>

                <TabsContent value="filters" className="space-y-6">
                    <div>
                        <Label className="text-sm font-medium">Time Range</Label>
                        <Select defaultValue="3months">
                            <SelectTrigger className="mt-2">
                                <SelectValue/>
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
                        <Label className="text-sm font-medium">Category</Label>
                        <Select defaultValue="all">
                            <SelectTrigger className="mt-2">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="electronics">Electronics</SelectItem>
                                <SelectItem value="accessories">Accessories</SelectItem>
                                <SelectItem value="clothing">Clothing</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-sm font-medium">Risk Level</Label>
                        <Select defaultValue="all">
                            <SelectTrigger className="mt-2">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Risk Levels</SelectItem>
                                <SelectItem value="high">High Risk</SelectItem>
                                <SelectItem value="medium">Medium Risk</SelectItem>
                                <SelectItem value="low">Low Risk</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-sm font-medium">Forecast Accuracy</Label>
                        <div className="mt-2 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span>Min: 0%</span>
                                <span>Max: 100%</span>
                            </div>
                            <Input
                                type="range"
                                min="0"
                                max="100"
                                value={value}
                                onChange={(e) => setValue(Number(e.target.value))}
                                className="w-full p-0"
                            />
                            <span className="text-sm">Selected Accuracy: {value}%</span>
                        </div>
                    </div>
                    <Button className="w-full">Apply Filters</Button>
                </TabsContent>
                <TabsContent value="alerts" className="space-y-4">
                    <div className="space-y-3">
                        {alerts.map((alert, index) => (
                            <Card key={index} className="p-3">
                                <div className="flex items-start gap-3">
                                    <span className="text-lg">{getAlertIcon(alert.type)}</span>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                                        <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                    <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
                        <div className="space-y-2">
                            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                                <AlertTriangle className="w-4 h-4 mr-2"/>
                                View All Alerts
                            </Button>
                            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                                <TrendingUp className="w-4 h-4 mr-2"/>
                                Accuracy Report
                            </Button>
                            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                                <Package className="w-4 h-4 mr-2"/>
                                Reorder Suggestions
                            </Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}