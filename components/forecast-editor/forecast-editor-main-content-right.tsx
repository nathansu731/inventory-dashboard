import {ScrollArea} from "@/components/ui/scroll-area";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {monthColumns} from "@/components/forecast-editor/sample-data";
import type React from "react";

type ForecastData = {
    category: string
    region: string
    "01/2024": number
    "02/2024": number
    "03/2024": number
    "04/2024": number
    "05/2024": number
    "06/2024": number
}[]

type ForecastEditorMainContentRightProps = {
    forecastValues: ForecastData,
    editingCell: string | null,
    editedCells: Set<string>,
    handleCellClick: (rowIndex: number, month: string) => void,
    tempValue: string,
    setTempValue: React.Dispatch<React.SetStateAction<string>>,
    handleCellBlur: (rowIndex: number, month: string) => void,
    handleKeyPress: (e: React.KeyboardEvent, rowIndex: number, month: string) => void,
}

export const ForecastEditorMainContentRight = ({forecastValues, editingCell, editedCells, handleCellClick, tempValue, setTempValue, handleCellBlur, handleKeyPress}: ForecastEditorMainContentRightProps) => {
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
                                {monthColumns.map((month) => (
                                    <TableHead key={month} className="w-[100px] text-center">
                                        {month}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {forecastValues.map((row, rowIndex) => (
                                <TableRow key={rowIndex} className="h-12">
                                    {monthColumns.map((month) => {
                                        const cellKey = `${rowIndex}-${month}`;
                                        const isEditing = editingCell === cellKey;
                                        const isEdited = editedCells.has(cellKey);
                                        const cellValue = row[
                                            month as keyof typeof row
                                            ] as number;

                                        return (
                                            <TableCell
                                                key={month}
                                                className={`text-center font-mono text-sm cursor-pointer hover:bg-muted/50 ${
                                                    isEdited ? "bg-blue-50 border-blue-200" : ""
                                                }`}
                                                onClick={() =>
                                                    !isEditing && handleCellClick(rowIndex, month)
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
                                                    cellValue.toLocaleString()
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </ScrollArea>
        </div>
    )
}