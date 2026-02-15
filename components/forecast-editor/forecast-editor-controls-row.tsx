import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, ChevronDown, Columns, Download, Eye, Save } from "lucide-react"
import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ForecastEditorColumnSelector } from "@/components/forecast-editor/forecast-editor-column-selector"

type ForecastEditorControlsRowProps = {
    aggregationType: string
    setAggregationType: React.Dispatch<React.SetStateAction<string>>;
    storeLabel: string | null
    skuLabel: string | null
    skuIndex: number
    skuCount: number
    onPrevSku: () => void
    onNextSku: () => void
    onSave: () => void
    isSaving: boolean
}

export const ForecastEditorControlsRow = ({
    aggregationType,
    setAggregationType,
    storeLabel,
    skuLabel,
    skuIndex,
    skuCount,
    onPrevSku,
    onNextSku,
    onSave,
    isSaving,
}: ForecastEditorControlsRowProps) => {
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
        <div id="editor-button-panel" className="flex flex-wrap items-center justify-between border-b bg-muted/30 px-6 py-3 gap-3">
            <div className="flex items-center gap-4 mr-3 flex-wrap">
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
                <div className="flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs text-muted-foreground">
                    <span className="font-semibold text-slate-900">{skuLabel ?? "SKU"}</span>
                    <span className="text-muted-foreground">·</span>
                    <span>{storeLabel ?? "Store"}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" onClick={onPrevSku} disabled={skuCount <= 1}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" onClick={onNextSku} disabled={skuCount <= 1}>
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground ml-2">
                        {skuCount > 0 ? `${skuIndex + 1} of ${skuCount}` : "No SKUs"}
                    </span>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center gap-responsive-sm">
                <Button variant="default" size="sm" onClick={onSave} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2"/>
                    {isSaving ? "Saving..." : "Save"}
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
                    <Download className="h-4 w-4 mr-2"/>
                    Export
                </Button>
            </div>
        </div>
    )
}
