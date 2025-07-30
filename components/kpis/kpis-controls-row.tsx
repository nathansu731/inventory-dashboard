import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {
    ArrowDownWideNarrow,
    ChevronDown, CircleQuestionMark,
    Columns,
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
        <div className="flex items-center justify-between border-b bg-muted/30 px-6 py-3">
            <div className="flex items-center gap-1 mr-1">
                <p className="font-medium">Aggregation</p>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className="min-w-[120px] justify-between bg-transparent"
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

            <div className="flex items-center gap-2">
                <Button variant="default" size="sm">
                    <Save className="h-4 w-4"/>
                </Button>
                <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                </Button>
                <Dialog open={isColumnModalOpen} onOpenChange={setIsColumnModalOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Columns className="h-4 w-4 mr-2"/>
                            Columns
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
                <Button variant="outline" size="sm">
                    <ArrowDownWideNarrow />
                </Button>
                <div className="flex items-center gap-0 ml-1 mr-1">
                    <Button variant="outline" size="sm">
                        <House />
                    </Button>
                    <Button variant="outline" size="sm">
                        <User />
                    </Button>
                    <Button variant="outline" size="sm">
                        <Scale />
                    </Button>
                </div>
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            {accuracy}
                            <ChevronDown className="h-4 w-4 ml-2"/>
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
                <Button variant="outline" size="sm">
                    <Network className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4"/>
                </Button>
                <Button variant="outline" size="sm">
                    Units
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
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
                <Button variant="outline" size="sm">
                    <CircleQuestionMark />
                </Button>
                <Button variant="outline" size="sm">
                    <HardDriveDownload />
                </Button>
                <Button variant="outline" size="sm">
                    10 Elements
                </Button>
            </div>
        </div>
    )
}