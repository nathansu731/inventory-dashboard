import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {
    ArrowDownWideNarrow,
    ChevronDown, CircleQuestionMark,
    Columns, DollarSign,
    Filter,
    HardDriveDownload, House,
    Network,
    Save, Scale,
    Trash2, User
} from "lucide-react";
import React, {useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {KpisColumnSelector} from "@/components/kpis/kpis-column-selector";

type ForecastEditorControlsRowProps = {
    aggregationType: string
    setAggregationType: React.Dispatch<React.SetStateAction<string>>;
    unitsType: string
    setUnitsType: React.Dispatch<React.SetStateAction<string>>;
}

export const KpisControlsRow = ({aggregationType, setAggregationType, unitsType, setUnitsType}: ForecastEditorControlsRowProps) => {
    const [accuracy, setAccuracy] = useState("Accuracy");
    const [lag, setLag] = useState("Lag 0");
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
        aug: true,
    })
    return (
        <div className="flex items-start justify-between border-b bg-muted/30 px-6 py-3">
            <div className="flex items-center gap-1 mr-3">
                <p className="font-medium text-sm">Aggregation</p>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className="min-w-0 min-w-[80px] justify-between bg-transparent"
                            size="xs"
                        >
                            {aggregationType}
                            <ChevronDown className="h-4 w-4"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setAggregationType("Daily")}>
                            Daily
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAggregationType("Weekly")}>
                            Weekly
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAggregationType("Monthly")}>
                            Monthly
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAggregationType("Quarterly")}>
                            Quarterly
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAggregationType("Yearly")}>
                            Yearly
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="flex flex-wrap gap-2 items-center gap-2 gap-responsive-sm">
                <Button variant="outline" size="xs">
                    <Save className="h-4 w-4"/>
                </Button>
                <Button variant="outline" size="xs">
                    <Trash2 className="h-4 w-4"/>
                </Button>
                <Dialog open={isColumnModalOpen} onOpenChange={setIsColumnModalOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="xs">
                            <Columns className="h-4 w-4"/>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Choose Columns</DialogTitle>
                        </DialogHeader>
                        <KpisColumnSelector setIsColumnModalOpen={setIsColumnModalOpen}
                                            columnVisibility={columnVisibility}
                                            setColumnVisibility={setColumnVisibility}/>
                    </DialogContent>
                </Dialog>
                <Button variant="outline" size="xs">
                    <ArrowDownWideNarrow/>
                </Button>
                <div className="flex items-center gap-2 ml-1 mr-1 hidden md:flex gap-responsive-sm">
                    <Button variant="outline" size="xs">
                        <House/>
                    </Button>
                    <Button variant="outline" size="xs">
                        <User/>
                    </Button>
                    <Button variant="outline" size="xs">
                        <Scale/>
                    </Button>
                    <Button variant="outline" size="xs">
                        <Network className="h-4 w-4"/>
                    </Button>
                    <Button variant="outline" size="xs">
                        <Filter/>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="xs" className="min-w-0 min-w-[70px] justify-between">
                                {unitsType}
                                <ChevronDown className="h-4 w-4"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setUnitsType("USD")}>
                                USD
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setUnitsType("Units")}>
                                Units
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="xs" className="min-w-0 min-w-[85px]">
                            {accuracy}
                            <ChevronDown className="h-4 w-4"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setAccuracy("25%")}>
                            25%
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAccuracy("50%")}>
                            50%
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAccuracy("75%")}>
                            75%
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAccuracy("Percentage")}>
                            Percentage
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="xs" className="min-w-0 min-w-[70px]">
                            {lag}
                            <ChevronDown className="h-4 w-4"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setLag("Lag 1")}>
                            Lag 1
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLag("Lag 2")}>
                            Lag 2
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLag("Lag 3")}>
                            Lag 3
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLag("Lag 4")}>
                            Lag 4
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLag("Lag 5")}>
                            Lag 5
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex items-center gap-1 ml-1 mr-1 hidden md:flex">
                <Button variant="outline" size="xs">
                    <CircleQuestionMark/>
                </Button>
                <Button variant="outline" size="xs">
                    <HardDriveDownload/>
                </Button>
                </div>
                <div className="ml-1 mr-1 block md:hidden relative">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="xs">
                                <ChevronDown className="h-4 w-4"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="min-w-0 w-[60px]">
                            <DropdownMenuItem>
                                <Button variant="outline" size="xs">
                                <House/>
                                </Button>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Button variant="outline" size="xs">
                                <User/>
                                </Button>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Button variant="outline" size="xs">
                                <Scale/>
                                </Button>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Button variant="outline" size="xs">
                                <Network className="h-4 w-4"/>
                                </Button>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Button variant="outline" size="xs">
                                <Filter className="h-4 w-4"/>
                                </Button>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Button variant="outline" size="xs">
                                    <DollarSign/>
                                </Button>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Button variant="outline" size="xs">
                                    <CircleQuestionMark/>
                                </Button>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Button variant="outline" size="xs">
                                    <HardDriveDownload/>
                                </Button>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    )
}
