import {Card, CardContent} from "@/components/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {kpiRowData} from "@/components/kpi-navigator/kpi-table-data";

type KpiTableProps = {
    months: string[],
};

export const KpiNavigatorTable = ({months}: KpiTableProps) => {
    return (
        <Card className="w-full">
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 h-8">
                                <TableHead
                                    className="font-semibold text-gray-900 sticky left-0 bg-gray-50 min-w-[100px] py-1 px-3 text-sm z-10"
                                >
                                </TableHead>
                                <TableHead
                                    className="font-semibold text-gray-900 sticky left-[100px] bg-gray-50 min-w-[100px] py-1 px-3 text-sm z-10"
                                >
                                </TableHead>
                                <TableHead className="text-center font-semibold text-gray-900 bg-gray-50 min-w-[100px] py-1 px-2 text-sm">
                                    Average
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
                            {kpiRowData.map((row, index) => {
                                const numericValues = row.values.map(Number);
                                const average = numericValues.length
                                    ? (numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length).toFixed(2)
                                    : "0.00";

                                const isFirstRow = index === 0;

                                return (
                                    <TableRow
                                        key={row.label}
                                        className={`h-8 ${index % 2 === 0 ? "bg-white" : "bg-white"}`}
                                    >
                                        {isFirstRow ? (
                                            <TableCell
                                                colSpan={2}
                                                className="font-medium text-gray-900 sticky left-0 bg-inherit border-r py-1 px-3 text-sm"
                                            >
                                                {row.label}
                                            </TableCell>
                                        ) : (
                                            <>
                                                <TableCell className="font-medium text-gray-900 sticky left-0 bg-inherit border-r py-1 px-3 text-sm">
                                                    {row.label}
                                                </TableCell>
                                                <TableCell className="sticky left-[100px] bg-inherit border-r py-1 px-3 text-sm"></TableCell>
                                            </>
                                        )}

                                        <TableCell className="text-center text-blue-600 py-1 px-2 text-sm font-medium bg-inherit">
                                            {average}
                                        </TableCell>

                                        {row.values.map((value, colIndex) => (
                                            <TableCell key={colIndex} className="text-center text-gray-700 py-1 px-2 text-sm bg-inherit">
                                                {Number.parseInt(value) >= 0 ? (
                                                    <span className="text-green-600">{value}</span>
                                                ) : (
                                                    <span className="text-red-600">{value}</span>
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}