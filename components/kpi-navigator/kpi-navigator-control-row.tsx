import {Card, CardContent} from "@/components/ui/card";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Button} from "@/components/ui/button";
import {Columns3, RefreshCw} from "lucide-react";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {useState} from "react";
import {KpiNavigatorColumnSelector} from "@/components/kpi-navigator/kpi-navigator-column-selector";


export const KpiNavigatorControlRow = () => {
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
                <div className="flex flex-col md:flex-row items-center justify-between gap-y-2 md:gap-y-2 flex-wrap">
                    <div className="flex items-center space-x-4">
                        <Select defaultValue="monthly">
                            <SelectTrigger className="md:w-40">
                                <SelectValue placeholder="Time Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="quarterly">Quarterly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select defaultValue="linear">
                            <SelectTrigger className="md:w-48">
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
                                <KpiNavigatorColumnSelector setIsColumnModalOpen={setIsColumnModalOpen}
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