import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, ChevronDown, Download, RotateCcw, Save } from "lucide-react"
import React from "react"

type ForecastEditorControlsRowProps = {
    aggregationType: "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Yearly"
    setAggregationType: React.Dispatch<React.SetStateAction<"Daily" | "Weekly" | "Monthly" | "Quarterly" | "Yearly">>
    availableAggregations: Array<"Daily" | "Weekly" | "Monthly" | "Quarterly" | "Yearly">
    storeLabel: string | null
    skuLabel: string | null
    skuIndex: number
    skuCount: number
    onPrevSku: () => void
    onNextSku: () => void
    onSave: () => void
    isSaving: boolean
    disableSave?: boolean
    onExport: () => void
    isApproved: boolean
    onToggleApproval: () => void
    disableApproval?: boolean
    onReset?: () => void
    dirtyCount?: number
}

export const ForecastEditorControlsRow = ({
    aggregationType,
    setAggregationType,
    availableAggregations,
    storeLabel,
    skuLabel,
    skuIndex,
    skuCount,
    onPrevSku,
    onNextSku,
    onSave,
    isSaving,
    disableSave = false,
    onExport,
    isApproved,
    onToggleApproval,
    disableApproval = false,
    onReset,
    dirtyCount = 0,
}: ForecastEditorControlsRowProps) => {
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
                        {availableAggregations.map((value) => (
                            <DropdownMenuItem key={value} onClick={() => setAggregationType(value)}>
                                {value}
                            </DropdownMenuItem>
                        ))}
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
                <Button variant={isApproved ? "default" : "outline"} size="sm" onClick={onToggleApproval} disabled={disableApproval}>
                    {isApproved ? "Approved" : "Approve"}
                </Button>
                {onReset ? (
                    <Button variant="outline" size="sm" onClick={onReset} disabled={dirtyCount === 0}>
                        <RotateCcw className="h-4 w-4 mr-2"/>
                        Reset Changes
                    </Button>
                ) : null}
                <Button variant="default" size="sm" onClick={onSave} disabled={isSaving || disableSave}>
                    <Save className="h-4 w-4 mr-2"/>
                    {isSaving ? "Starting..." : "Run Scenario"}
                </Button>
                <Button variant="outline" size="sm" onClick={onExport}>
                    <Download className="h-4 w-4 mr-2"/>
                    Export
                </Button>
            </div>
        </div>
    )
}
