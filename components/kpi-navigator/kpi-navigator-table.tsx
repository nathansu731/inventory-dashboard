"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useEffect, useState } from "react"

type KpiTableProps = {
    months: string[]
}

type KpiRow = {
    label: string
    values: string[]
}

export const KpiNavigatorTable = ({ months }: KpiTableProps) => {
    const [kpiRowData, setKpiRowData] = useState<KpiRow[]>([])

    useEffect(() => {
        const loadKpis = async () => {
            const res = await fetch("/api/get-sku-forecasts")
            if (!res.ok) return

            const { result } = await res.json()
            const data = typeof result === "string" ? JSON.parse(result) : result
            console.log("Data-",data)

            const rows: KpiRow[] = [
                { key: "demand", label: "Demand" },
                { key: "accuracy", label: "Accuracy" },
                { key: "error", label: "Error" },
                { key: "biasPercent", label: "Bias(%)" },
                { key: "bias", label: "Bias" },
            ].map(({ key, label }) => ({
                label,
                values: months.map((m) => {
                    const [month, year] = m.split("/")
                    const apiKey = `${month.padStart(2, "0")}-${year}`
                    return String(data[key]?.[apiKey] ?? "0")
                }),
            }))

            setKpiRowData(rows)
        }

        loadKpis()
    }, [months])

    return (
        <Card
            className="border rounded-lg min-w-0 px-1"
            style={{
                maxHeight: "500px",
                overflowY: "auto",
                overflowX: "auto",
                width: "100%",
                maxWidth: "100%",
            }}
        >
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table className="min-w-max table-auto">
                        <TableHeader>
                            <TableRow className="bg-gray-50 h-8">
                                <TableHead className="font-semibold text-gray-900 sticky left-0 bg-gray-50 min-w-[100px] py-1 px-3 text-sm z-10"></TableHead>
                                <TableHead className="font-semibold text-gray-900 sticky left-[100px] bg-gray-50 min-w-[100px] py-1 px-3 text-sm z-10"></TableHead>
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
                                const numericValues = row.values.map(Number)
                                const average = numericValues.length
                                    ? (
                                        numericValues.reduce((sum, val) => sum + val, 0) /
                                        numericValues.length
                                    ).toFixed(2)
                                    : "0.00"

                                const isFirstRow = index === 0

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
                                            <TableCell
                                                key={colIndex}
                                                className="text-center text-gray-700 py-1 px-2 text-sm bg-inherit"
                                            >
                                                {Number.parseInt(value) >= 0 ? (
                                                    <span className="text-green-600">{value}</span>
                                                ) : (
                                                    <span className="text-red-600">{value}</span>
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}