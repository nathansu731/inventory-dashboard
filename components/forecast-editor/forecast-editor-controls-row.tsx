import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {ChevronDown, Columns, Download, Eye, Filter, GitBranch, Save} from "lucide-react";
import React, {useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {ForecastEditorColumnSelector} from "@/components/forecast-editor/forecast-editor-column-selector";

type ForecastEditorControlsRowProps = {
    aggregationType: string
    setAggregationType: React.Dispatch<React.SetStateAction<string>>;
    unitsType: string
    setUnitsType: React.Dispatch<React.SetStateAction<string>>;
}

export const ForecastEditorControlsRow = ({aggregationType, setAggregationType, unitsType, setUnitsType}: ForecastEditorControlsRowProps) => {
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
            <div className="flex items-center gap-4">
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
                    <Save className="h-4 w-4 mr-2"/>
                    Save
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
                        <ForecastEditorColumnSelector setIsColumnModalOpen={setIsColumnModalOpen}
                                                       columnVisibility={columnVisibility}
                                                       setColumnVisibility={setColumnVisibility}/>
                    </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2"/>
                    View
                </Button>
                <Button variant="outline" size="sm">
                    <GitBranch className="h-4 w-4 mr-2"/>
                    Hierarchy
                </Button>
                <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2"/>
                    Filter
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            {unitsType}
                            <ChevronDown className="h-4 w-4 ml-2"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setUnitsType("USD")}>
                            USD
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setUnitsType("EUR")}>
                            EUR
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setUnitsType("Units")}>
                            Units
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setUnitsType("Percentage")}>
                            Percentage
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2"/>
                    Export
                </Button>
            </div>
        </div>
    )
}