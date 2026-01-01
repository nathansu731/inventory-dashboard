"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useEffect, useState } from "react"
import type React from "react"

type MonthlyMetric = {
    value: number
    variance: number
    status: "positive" | "negative" | "stable"
}

type MonthlyTotalsResult = {
    totalRevenue?: MonthlyMetric
    operatingExpenses?: MonthlyMetric
    netIncome?: MonthlyMetric
    grossMargin?: MonthlyMetric
    ebitda?: MonthlyMetric
    cashFlow?: MonthlyMetric
    marketShare?: MonthlyMetric
    customerAcquisition?: MonthlyMetric
}

export const ForecastEditorMainContentLeft = () => {
    const [data, setData] = useState<MonthlyTotalsResult | null>(null)

    useEffect(() => {
        const loadMonthlyTotals = async () => {
            const res = await fetch("/api/get-monthly-totals")
            if (!res.ok) return

            const json = await res.json()
            const result =
                typeof json.result === "string"
                    ? JSON.parse(json.result)
                    : json.result

            setData(result)
        }

        loadMonthlyTotals()
    }, [])

    const summaryData = [
        {
            metric: "Total Revenue",
            value: data?.totalRevenue
                ? `$${data.totalRevenue.value.toLocaleString()}`
                : "--",
            variance: data?.totalRevenue
                ? `${data.totalRevenue.variance >= 0 ? "+" : ""}${(
                    data.totalRevenue.variance * 100
                ).toFixed(1)}%`
                : "--",
            status:
                data?.totalRevenue?.status === "positive"
                    ? "On Track"
                    : data?.totalRevenue?.status === "negative"
                        ? "Under Budget"
                        : "Stable",
        },
        {
            metric: "Operating Expenses",
            value: data?.operatingExpenses
                ? `$${data.operatingExpenses.value.toLocaleString()}`
                : "--",
            variance: data?.operatingExpenses
                ? `${data.operatingExpenses.variance >= 0 ? "+" : ""}${(
                    data.operatingExpenses.variance * 100
                ).toFixed(1)}%`
                : "--",
            status:
                data?.operatingExpenses?.status === "positive"
                    ? "Exceeding"
                    : data?.operatingExpenses?.status === "negative"
                        ? "Under Budget"
                        : "Stable",
        },
        {
            metric: "Net Income",
            value: data?.netIncome
                ? `$${data.netIncome.value.toLocaleString()}`
                : "--",
            variance: data?.netIncome
                ? `${data.netIncome.variance >= 0 ? "+" : ""}${(
                    data.netIncome.variance * 100
                ).toFixed(1)}%`
                : "--",
            status:
                data?.netIncome?.status === "positive"
                    ? "Exceeding"
                    : data?.netIncome?.status === "negative"
                        ? "Weak"
                        : "Stable",
        },
        {
            metric: "Gross Margin",
            value: data?.grossMargin
                ? `${data.grossMargin.value.toFixed(1)}%`
                : "--",
            variance: data?.grossMargin
                ? `${data.grossMargin.variance >= 0 ? "+" : ""}${(
                    data.grossMargin.variance * 100
                ).toFixed(1)}%`
                : "--",
            status:
                data?.grossMargin?.status === "positive"
                    ? "Improving"
                    : data?.grossMargin?.status === "negative"
                        ? "Declining"
                        : "Stable",
        },
        {
            metric: "EBITDA",
            value: data?.ebitda
                ? `$${data.ebitda.value.toLocaleString()}`
                : "--",
            variance: data?.ebitda
                ? `${data.ebitda.variance >= 0 ? "+" : ""}${(
                    data.ebitda.variance * 100
                ).toFixed(1)}%`
                : "--",
            status:
                data?.ebitda?.status === "positive"
                    ? "Strong"
                    : data?.ebitda?.status === "negative"
                        ? "Weak"
                        : "Stable",
        },
        {
            metric: "Cash Flow",
            value: data?.cashFlow
                ? `$${data.cashFlow.value.toLocaleString()}`
                : "--",
            variance: data?.cashFlow
                ? `${data.cashFlow.variance >= 0 ? "+" : ""}${(
                    data.cashFlow.variance * 100
                ).toFixed(1)}%`
                : "--",
            status:
                data?.cashFlow?.status === "positive"
                    ? "Positive"
                    : data?.cashFlow?.status === "negative"
                        ? "Negative"
                        : "Stable",
        },
        {
            metric: "Market Share",
            value: data?.marketShare
                ? `${data.marketShare.value.toFixed(1)}%`
                : "--",
            variance: data?.marketShare
                ? `${data.marketShare.variance >= 0 ? "+" : ""}${(
                    data.marketShare.variance * 100
                ).toFixed(1)}%`
                : "--",
            status:
                data?.marketShare?.status === "positive"
                    ? "Growing"
                    : data?.marketShare?.status === "negative"
                        ? "Declining"
                        : "Stable",
        },
        {
            metric: "Customer Acquisition",
            value: data?.customerAcquisition
                ? data.customerAcquisition.value.toLocaleString()
                : "--",
            variance: data?.customerAcquisition
                ? `${data.customerAcquisition.variance >= 0 ? "+" : ""}${(
                    data.customerAcquisition.variance * 100
                ).toFixed(1)}%`
                : "--",
            status:
                data?.customerAcquisition?.status === "positive"
                    ? "Accelerating"
                    : data?.customerAcquisition?.status === "negative"
                        ? "Slowing"
                        : "Stable",
        },
    ]

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
                        {summaryData.map((item, index) => (
                            <TableRow key={index} className="h-12">
                                <TableCell className="font-medium text-sm">
                                    {item.metric}
                                </TableCell>
                                <TableCell className="text-sm font-mono">
                                    {item.value}
                                </TableCell>
                                <TableCell
                                    className={`text-sm font-mono ${
                                        item.variance.startsWith("+")
                                            ? "text-green-600"
                                            : "text-red-600"
                                    }`}
                                >
                                    {item.variance}
                                </TableCell>
                                <TableCell>
                  <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.status === "Exceeding" ||
                          item.status === "Strong" ||
                          item.status === "Accelerating"
                              ? "bg-green-100 text-green-800"
                              : item.status === "On Track" ||
                              item.status === "Improving" ||
                              item.status === "Positive" ||
                              item.status === "Growing"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-yellow-100 text-yellow-800"
                      }`}
                  >
                    {item.status}
                  </span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    )
}