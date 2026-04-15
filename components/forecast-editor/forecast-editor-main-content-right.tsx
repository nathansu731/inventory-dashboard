import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type React from "react"

type ForecastRow = {
    metric: string
    metricKey: string
    [key: string]: number | string | null
}

type ForecastEditorMainContentRightProps = {
    forecastValues: ForecastRow[]
    monthColumns: string[]
    formattedColumns: string[]
    editableMetrics: string[]
    editingCell: string | null
    editedCells: Set<string>
    handleCellClick: (rowIndex: number, month: string) => void
    tempValue: string
    setTempValue: React.Dispatch<React.SetStateAction<string>>
    handleCellBlur: (rowIndex: number, month: string) => void
    handleKeyPress: (e: React.KeyboardEvent, rowIndex: number, month: string) => void
    isLoading: boolean
}

export const ForecastEditorMainContentRight = ({
    forecastValues,
    monthColumns,
    formattedColumns,
    editingCell,
    editedCells,
    handleCellClick,
    tempValue,
    setTempValue,
    handleCellBlur,
    handleKeyPress,
    isLoading,
    editableMetrics,
}: ForecastEditorMainContentRightProps) => {
    return (
        <div className="flex-1 bg-background">
            <div className="border-b bg-muted/50 px-4 py-3">
                <h2 className="font-medium text-foreground">Forecast Values</h2>
            </div>
            <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="min-w-[800px]">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                                <TableHead className="w-[180px] text-left">Metric</TableHead>
                                {monthColumns.map((month, index) => (
                                    <TableHead key={month} className="w-[100px] text-center">
                                        {formattedColumns[index]}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <TableRow className="h-12">
                                    <TableCell colSpan={monthColumns.length + 1} className="text-sm text-muted-foreground">
                                        Loading forecast values...
                                    </TableCell>
                                </TableRow>
                            )}
                            {!isLoading && forecastValues.map((row, rowIndex) => (
                                <TableRow key={rowIndex} className="h-12">
                                    <TableCell className="font-medium text-sm">
                                        {row.metric}
                                    </TableCell>
                                    {monthColumns.map((month) => {
                                        const cellKey = `${row.metricKey}:${month}`;
                                        const isEditing = editingCell === cellKey;
                                        const isEdited = editedCells.has(cellKey);
                                        const rawValue = row[month];
                                        const isMissing = rawValue === null || rawValue === undefined || rawValue === "";
                                        const cellValue = isMissing ? null : Number(rawValue);
                                        const isEditable = month !== "average" && editableMetrics.includes(row.metricKey);

                                        return (
                                            <TableCell
                                                key={month}
                                                className={`text-center font-mono text-sm ${isEditable ? "cursor-pointer hover:bg-muted/50" : "text-muted-foreground"} ${
                                                    isEdited ? "bg-blue-50 border-blue-200" : ""
                                                }`}
                                                onClick={() =>
                                                    isEditable && !isEditing && handleCellClick(rowIndex, month)
                                                }
                                            >
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={tempValue}
                                                        onChange={(e) => setTempValue(e.target.value)}
                                                        onBlur={() => handleCellBlur(rowIndex, month)}
                                                        onKeyPress={(e) =>
                                                            handleKeyPress(e, rowIndex, month)
                                                        }
                                                        className="w-full text-center bg-transparent border-none outline-none font-mono text-sm"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    isMissing || Number.isNaN(cellValue) ? "--" : cellValue!.toLocaleString()
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                            {!isLoading && forecastValues.length === 0 && (
                                <TableRow className="h-12">
                                    <TableCell colSpan={monthColumns.length + 1} className="text-sm text-muted-foreground">
                                        No forecast data available.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </ScrollArea>
        </div>
    )
}
