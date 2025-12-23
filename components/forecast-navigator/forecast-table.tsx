import { Card, CardContent } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

type RowData = {
    label: string
    values: string[]
}

type ForecastTableProps = {
    months: string[]
    rowData: RowData[]
}

export const ForecastTable = ({ months, rowData }: ForecastTableProps) => {
    return (
        <Card className="w-full">
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 h-8">
                                <TableHead className="font-semibold text-gray-900 sticky left-0 bg-gray-50 min-w-[200px] py-1 px-3 text-sm">
                                    Metric
                                </TableHead>

                                {months.map((month) => (
                                    <TableHead
                                        key={month}
                                        className="text-center font-semibold text-gray-900 min-w-[100px] py-1 px-2 text-sm"
                                    >
                                        {month}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {rowData.map((row, index) => (
                                <TableRow
                                    key={row.label}
                                    className={`h-8 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                                >
                                    <TableCell className="font-medium text-gray-900 sticky left-0 bg-inherit border-r py-1 px-3 text-sm">
                                        {row.label}
                                    </TableCell>

                                    {months.map((_, colIndex) => {
                                        const value = row.values[colIndex] ?? "0"
                                        const numeric = Number(value)

                                        return (
                                            <TableCell
                                                key={colIndex}
                                                className="text-center text-gray-700 py-1 px-2 text-sm"
                                            >
                        <span className={numeric >= 0 ? "text-green-600" : "text-red-600"}>
                          {numeric}
                        </span>
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}