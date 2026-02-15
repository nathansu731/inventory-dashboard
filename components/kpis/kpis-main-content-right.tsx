import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type React from "react"

type ForecastRow = {
    metric: string
    [key: string]: number | string
}

type KpisMainContentRightProps = {
    forecastValues: ForecastRow[]
    monthColumns: string[]
    formattedColumns: string[]
    isLoading: boolean
}

export const KpisMainContentRight = ({ forecastValues, monthColumns, formattedColumns, isLoading }: KpisMainContentRightProps) => {
    return (
        <div className="flex-1 bg-background">
            <div className="border-b bg-muted/50 px-4 py-3">
                <h2 className="font-medium text-foreground">Monthly Forecast KPIs</h2>
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
                                        Loading KPI series...
                                    </TableCell>
                                </TableRow>
                            )}
                            {!isLoading && forecastValues.map((row, rowIndex) => (
                                <TableRow key={rowIndex} className="h-12">
                                    <TableCell className="font-medium text-sm">
                                        {row.metric}
                                    </TableCell>
                                    {monthColumns.map((month) => {
                                        const cellValue = Number(row[month] ?? 0)
                                        return (
                                            <TableCell
                                                key={month}
                                                className="text-center font-mono text-sm"
                                            >
                                                {cellValue.toLocaleString()}
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            ))}
                            {!isLoading && forecastValues.length === 0 && (
                                <TableRow className="h-12">
                                    <TableCell colSpan={monthColumns.length + 1} className="text-sm text-muted-foreground">
                                        No KPI series available.
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
