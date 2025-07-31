import {ScrollArea} from "@/components/ui/scroll-area";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import type React from "react";
import {monthColumnsKpi} from "@/components/kpis/sample-data";

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

type KpisMainContentRightProps = {
    forecastValues: ForecastData,
}

export const KpisMainContentRight = ({forecastValues}: KpisMainContentRightProps) => {
    return (
        <div className="flex-1 bg-background">
            <div className="border-b bg-muted/50 px-4 py-3">
                <h2 className="font-medium text-foreground">Accuracy (%)</h2>
            </div>
            <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="min-w-[800px]">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                                {monthColumnsKpi.map((month) => (
                                    <TableHead key={month} className="w-[100px] text-center">
                                        {month}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {forecastValues.map((row, rowIndex) => (
                                <TableRow key={rowIndex} className="h-12">
                                    {monthColumnsKpi.map((month) => {
                                        const cellValue = row[
                                            month as keyof typeof row
                                            ] as number;
                                        return (
                                            <TableCell
                                                key={month}
                                                className={`text-center font-mono text-sm cursor-pointer hover:bg-muted/50`}
                                            >
                                                {cellValue}
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