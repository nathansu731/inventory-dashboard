import {Checkbox} from "@/components/ui/checkbox";
import {Button} from "@/components/ui/button";

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


export function ForecastingSummaryHeaderColumnSelectors({setIsColumnModalOpen, columnVisibility, setColumnVisibility}: ForecastingSummaryHeaderColumnSelectorsProps) {

    const handleColumnVisibilityChange = (column: string, visible: boolean) => {
        setColumnVisibility((prev) => ({
            ...prev,
            [column]: visible,
        }))
    }

    return (
        <div className="space-y-4 py-4">
            <div className="space-y-3">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="select"
                        checked={columnVisibility.select}
                        onCheckedChange={(checked) => handleColumnVisibilityChange("select", checked as boolean)}
                    />
                    <label
                        htmlFor="select"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Select All
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="view"
                        checked={columnVisibility.view}
                        onCheckedChange={(checked) => handleColumnVisibilityChange("view", checked as boolean)}
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
                        onCheckedChange={(checked) => handleColumnVisibilityChange("approved", checked as boolean)}
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
                        onCheckedChange={(checked) => handleColumnVisibilityChange("skuId", checked as boolean)}
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
                        onCheckedChange={(checked) => handleColumnVisibilityChange("store", checked as boolean)}
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
                        onCheckedChange={(checked) => handleColumnVisibilityChange("description", checked as boolean)}
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
                        onCheckedChange={(checked) =>
                            handleColumnVisibilityChange("forecastMethod", checked as boolean)
                        }
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
                        onCheckedChange={(checked) => handleColumnVisibilityChange("abcClass", checked as boolean)}
                    />
                    <label
                        htmlFor="abcClass"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        ABC Class
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="abcPercentage"
                        checked={columnVisibility.abcPercentage}
                        onCheckedChange={(checked) => handleColumnVisibilityChange("abcPercentage", checked as boolean)}
                    />
                    <label
                        htmlFor="abcPercentage"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        ABC %
                    </label>
                </div>
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