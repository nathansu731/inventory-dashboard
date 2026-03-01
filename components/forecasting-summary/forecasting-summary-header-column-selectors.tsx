import {Checkbox} from "@/components/ui/checkbox";
import {Button} from "@/components/ui/button";
import {ForecastingSummaryPercentage} from "@/components/forecasting-summary/forecasting-summary-percentage";

type ColumnVisibility = {
    select: boolean;
    view: boolean;
    approved: boolean;
    skuId: boolean;
    store: boolean;
    description: boolean;
    forecastMethod: boolean;
    abcClass: boolean;
    abcPercentage: boolean;
};

type ForecastingSummaryHeaderColumnSelectorsProps = {
    setIsColumnModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    columnVisibility: ColumnVisibility;
    setColumnVisibility: React.Dispatch<React.SetStateAction<ColumnVisibility>>;
};

const CONFIGURABLE_COLUMN_KEYS: Array<Exclude<keyof ColumnVisibility, "select">> = [
    "view",
    "approved",
    "skuId",
    "store",
    "description",
    "forecastMethod",
    "abcClass",
    "abcPercentage",
];

export const ForecastingSummaryHeaderColumnSelectors = ({setIsColumnModalOpen, columnVisibility, setColumnVisibility}: ForecastingSummaryHeaderColumnSelectorsProps) => {

    const handleColumnVisibilityChange = (column: keyof ColumnVisibility, visible: boolean) => {
        setColumnVisibility((prev) => ({
            ...prev,
            select: true,
            [column]: visible,
        }))
    }

    const handleAllColumnsChange = (checked: boolean) => {
        setColumnVisibility((prev) => ({
            ...prev,
            select: true,
            view: checked,
            approved: checked,
            skuId: checked,
            store: checked,
            description: checked,
            forecastMethod: checked,
            abcClass: checked,
            abcPercentage: checked,
        }))
    }

    const visibleCount = CONFIGURABLE_COLUMN_KEYS.filter((key) => columnVisibility[key]).length
    const allSelected = visibleCount === CONFIGURABLE_COLUMN_KEYS.length
    const partiallySelected = visibleCount > 0 && !allSelected

    return (
        <div className="space-y-4 py-4">
            <div className="space-y-3">
                <div className="flex items-center space-x-2 pb-2 border-b">
                    <Checkbox
                        id="allColumns"
                        checked={partiallySelected ? "indeterminate" : allSelected}
                        onCheckedChange={(checked) => handleAllColumnsChange(checked === true)}
                    />
                    <label
                        htmlFor="allColumns"
                        className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Select all columns
                    </label>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="view"
                        checked={columnVisibility.view}
                        onCheckedChange={(checked) => handleColumnVisibilityChange("view", checked === true)}
                    />
                    <label
                        htmlFor="view"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        View
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="approved"
                        checked={columnVisibility.approved}
                        onCheckedChange={(checked) => handleColumnVisibilityChange("approved", checked === true)}
                    />
                    <label
                        htmlFor="approved"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Approved
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="skuId"
                        checked={columnVisibility.skuId}
                        onCheckedChange={(checked) => handleColumnVisibilityChange("skuId", checked === true)}
                    />
                    <label
                        htmlFor="skuId"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        SKU/ID
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="store"
                        checked={columnVisibility.store}
                        onCheckedChange={(checked) => handleColumnVisibilityChange("store", checked === true)}
                    />
                    <label
                        htmlFor="store"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Store
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="description"
                        checked={columnVisibility.description}
                        onCheckedChange={(checked) => handleColumnVisibilityChange("description", checked === true)}
                    />
                    <label
                        htmlFor="description"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Description
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="forecastMethod"
                        checked={columnVisibility.forecastMethod}
                        onCheckedChange={(checked) => handleColumnVisibilityChange("forecastMethod", checked === true)}
                    />
                    <label
                        htmlFor="forecastMethod"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Forecast Method
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="abcClass"
                        checked={columnVisibility.abcClass}
                        onCheckedChange={(checked) => handleColumnVisibilityChange("abcClass", checked === true)}
                    />
                    <label
                        htmlFor="abcClass"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        ABC Class
                    </label>
                </div>
                <ForecastingSummaryPercentage
                    columnKey="abcPercentage"
                    label="ABC %"
                    checked={columnVisibility.abcPercentage}
                    onChange={(columnKey, checked) => handleColumnVisibilityChange(columnKey as keyof ColumnVisibility, checked)}
                />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsColumnModalOpen(false)}>
                    Cancel
                </Button>
                <Button onClick={() => setIsColumnModalOpen(false)}>Apply</Button>
            </div>
        </div>
    )
}
