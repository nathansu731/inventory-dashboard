import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type React from "react"

type MonthlyMetric = {
    value: number
    variance: number
    status: "positive" | "negative" | "stable"
}

type MonthlyTotalsResult = {
    totalRevenue?: MonthlyMetric
    newCustomers?: MonthlyMetric
    activeAccounts?: MonthlyMetric
    growthRate?: MonthlyMetric
}

type SummaryRow = {
    metric: string
    value: string
    variance: string
    status: "positive" | "negative" | "stable"
}

const buildSummaryRows = (data: MonthlyTotalsResult | null): SummaryRow[] => {
    if (!data) return []
    const formatValue = (value?: number) => (value !== undefined ? value.toLocaleString() : "--")
    const formatVariance = (variance?: number) =>
        variance !== undefined ? `${variance >= 0 ? "+" : ""}${(variance * 100).toFixed(1)}%` : "--"

    return [
        {
            metric: "Total Revenue",
            value: `$${formatValue(data.totalRevenue?.value)}`,
            variance: formatVariance(data.totalRevenue?.variance),
            status: data.totalRevenue?.status ?? "stable",
        },
        {
            metric: "New Customers",
            value: formatValue(data.newCustomers?.value),
            variance: formatVariance(data.newCustomers?.variance),
            status: data.newCustomers?.status ?? "stable",
        },
        {
            metric: "Active Accounts",
            value: formatValue(data.activeAccounts?.value),
            variance: formatVariance(data.activeAccounts?.variance),
            status: data.activeAccounts?.status ?? "stable",
        },
        {
            metric: "Growth Rate",
            value: formatVariance(data.growthRate?.variance),
            variance: formatVariance(data.growthRate?.variance),
            status: data.growthRate?.status ?? "stable",
        },
    ]
}

type ForecastEditorMainContentLeftProps = {
    summaryData: MonthlyTotalsResult | null
    isLoading: boolean
}

export const ForecastEditorMainContentLeft = ({ summaryData, isLoading }: ForecastEditorMainContentLeftProps) => {
    const rows = buildSummaryRows(summaryData)
    return (
        <div className="w-1/3 border-r bg-background">
            <div className="border-b bg-muted/50 px-4 py-3">
                <h2 className="font-medium text-foreground">Forecast Summary</h2>
            </div>
            <ScrollArea className="h-[calc(100vh-180px)] !overflow-x-auto">
                <Table className="min-w-max table-auto !overflow-x-auto">
                    <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                            <TableHead className="w-[140px]">Metric</TableHead>
                            <TableHead className="w-[100px]">Value</TableHead>
                            <TableHead className="w-[80px]">Variance</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow className="h-12">
                                <TableCell colSpan={4} className="text-sm text-muted-foreground">
                                    Loading summary...
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && rows.map((item, index) => (
                            <TableRow key={index} className="h-12">
                                <TableCell className="font-medium text-sm">
                                    {item.metric}
                                </TableCell>
                                <TableCell className="text-sm font-mono">
                                    {item.value}
                                </TableCell>
                                <TableCell
                                    className={`text-sm font-mono ${item.variance.startsWith("+") ? "text-green-600" : "text-red-600"}`}
                                >
                                    {item.variance}
                                </TableCell>
                                <TableCell>
                      <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              item.status === "positive"
                                  ? "bg-green-100 text-green-800"
                                  : item.status === "negative"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                          }`}
                      >
                        {item.status}
                      </span>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && rows.length === 0 && (
                            <TableRow className="h-12">
                                <TableCell colSpan={4} className="text-sm text-muted-foreground">
                                    No summary data available.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    )
}
