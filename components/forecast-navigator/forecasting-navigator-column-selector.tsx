import {Checkbox} from "@/components/ui/checkbox";
import {Button} from "@/components/ui/button";

type ColumnVisibility = {
    select: boolean;
    jan: boolean;
    feb: boolean;
    mar: boolean;
    apr: boolean;
    may: boolean;
    jun: boolean;
    jul: boolean;
};

type ForecastingNaviColumnSelectorProps = {
    setIsColumnModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    columnVisibility: ColumnVisibility;
    setColumnVisibility: React.Dispatch<React.SetStateAction<ColumnVisibility>>;
};


export const ForecastingNaviColumnSelector = ({setIsColumnModalOpen, columnVisibility, setColumnVisibility}: ForecastingNaviColumnSelectorProps) => {

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
                        checked={columnVisibility.jan}
                        onCheckedChange={(checked) => handleColumnVisibilityChange("jan", checked as boolean)}
                    />
                    <label
                        htmlFor="view"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Jan
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="approved"
                        checked={columnVisibility.feb}
                        onCheckedChange={(checked) => handleColumnVisibilityChange("feb", checked as boolean)}
                    />
                    <label
                        htmlFor="approved"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Feb
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="skuId"
                        checked={columnVisibility.mar}
                        onCheckedChange={(checked) => handleColumnVisibilityChange("mar", checked as boolean)}
                    />
                    <label
                        htmlFor="skuId"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Mar
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="store"
                        checked={columnVisibility.apr}
                        onCheckedChange={(checked) => handleColumnVisibilityChange("apr", checked as boolean)}
                    />
                    <label
                        htmlFor="store"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Apr
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="description"
                        checked={columnVisibility.may}
                        onCheckedChange={(checked) => handleColumnVisibilityChange("may", checked as boolean)}
                    />
                    <label
                        htmlFor="description"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        May
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="forecastMethod"
                        checked={columnVisibility.jun}
                        onCheckedChange={(checked) =>
                            handleColumnVisibilityChange("jun", checked as boolean)
                        }
                    />
                    <label
                        htmlFor="forecastMethod"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Jun
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="abcClass"
                        checked={columnVisibility.jul}
                        onCheckedChange={(checked) => handleColumnVisibilityChange("jul", checked as boolean)}
                    />
                    <label
                        htmlFor="abcClass"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        July
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