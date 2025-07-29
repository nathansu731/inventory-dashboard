import {Card, CardContent} from "@/components/ui/card";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Button} from "@/components/ui/button";
import {Columns, Columns3, RefreshCw} from "lucide-react";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {ForecastingNaviColumnSelector} from "@/components/forecast-navigator/forecasting-navigator-column-selector";
import {useState} from "react";


export const ControlRow = () => {
    const [isColumnModalOpen, setIsColumnModalOpen] = useState(false)
    const [columnVisibility, setColumnVisibility] = useState({
        select: true,
        jan: true,
        feb: true,
        mar: true,
        apr: true,
        may: true,
        jun: true,
        jul: true,
    })
    return (
        <Card className="py-1">
            <CardContent className="p-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Select defaultValue="monthly">
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Time Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="quarterly">Quarterly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select defaultValue="linear">
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Forecast Method" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="linear">Linear Regression</SelectItem>
                                <SelectItem value="exponential">Exponential Smoothing</SelectItem>
                                <SelectItem value="arima">ARIMA</SelectItem>
                                <SelectItem value="seasonal">Seasonal Decomposition</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                        <Dialog open={isColumnModalOpen} onOpenChange={setIsColumnModalOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Columns3 className="h-4 w-4 mr-2" />
                                    Columns
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Choose Columns</DialogTitle>
                                </DialogHeader>
                                <ForecastingNaviColumnSelector setIsColumnModalOpen={setIsColumnModalOpen}
                                                               columnVisibility={columnVisibility}
                                                               setColumnVisibility={setColumnVisibility}/>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}