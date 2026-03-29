import {Checkbox} from "@/components/ui/checkbox";
import {Button} from "@/components/ui/button";

type ForecastingNaviColumnSelectorProps = {
    setIsColumnModalOpen: React.Dispatch<React.SetStateAction<boolean>>
    monthColumns: string[]
    formattedColumns: string[]
    columnVisibility: Record<string, boolean>
    setColumnVisibility: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}


export const ForecastEditorColumnSelector = ({
    setIsColumnModalOpen,
    monthColumns,
    formattedColumns,
    columnVisibility,
    setColumnVisibility,
}: ForecastingNaviColumnSelectorProps) => {

    const handleColumnVisibilityChange = (column: string, visible: boolean) => {
        setColumnVisibility((prev) => ({
            ...prev,
            [column]: visible,
        }))
    }

    const allSelected = monthColumns.length > 0 && monthColumns.every((column) => columnVisibility[column] !== false)

    const setAllColumns = (visible: boolean) => {
        setColumnVisibility((prev) => {
            const next = { ...prev }
            monthColumns.forEach((column) => {
                next[column] = visible
            })
            return next
        })
    }

    return (
        <div className="space-y-4 py-4">
            <div className="space-y-3">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="select"
                        checked={allSelected}
                        onCheckedChange={(checked) => setAllColumns(checked === true)}
                    />
                    <label
                        htmlFor="select"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Select All
                    </label>
                </div>
                {monthColumns.map((column, index) => {
                    const checkboxId = `column-${column.replace(/[^a-zA-Z0-9_-]/g, "-")}`
                    return (
                        <div key={column} className="flex items-center space-x-2">
                            <Checkbox
                                id={checkboxId}
                                checked={columnVisibility[column] !== false}
                                onCheckedChange={(checked) => handleColumnVisibilityChange(column, checked === true)}
                            />
                            <label
                                htmlFor={checkboxId}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                {formattedColumns[index] ?? column}
                            </label>
                        </div>
                    )
                })}
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
