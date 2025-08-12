"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"

import { reportData } from "@/components/reports/reports-data";
import { ReportsControlRow } from "@/components/reports/reports-control-row";
import { ReportsDataTable } from "@/components/reports/reports-data-table";
import { ReportsDataTableFooter } from "@/components/reports/reports-data-table-footer";

export const ReportsPage = () => {
    const [date, setDate] = useState<Date>()
    const [filterOpen, setFilterOpen] = useState(false)
    const [selectedColumns, setSelectedColumns] = useState({
        date: true,
        region: true,
        product: true,
        revenue: true,
        forecast: true,
        accuracy: true,
        variance: false,
        status: true,
    })

    const [columnFilters, setColumnFilters] = useState({
        region: [] as string[],
        product: [] as string[],
        forecast: [] as string[],
        status: [] as string[],
    })

    const [displayCount, setDisplayCount] = useState(20)

    useEffect(() => {
        setDisplayCount(20)
    }, [columnFilters])

    const uniqueValues = {
        region: [...new Set(reportData.map((item) => item.region))],
        product: [...new Set(reportData.map((item) => item.product))],
        forecast: [...new Set(reportData.map((item) => item.forecast))],
        status: [...new Set(reportData.map((item) => item.status))],
    }

    const filteredData = reportData.filter((row) => {
        return (
            (columnFilters.region.length === 0 || columnFilters.region.includes(row.region)) &&
            (columnFilters.product.length === 0 || columnFilters.product.includes(row.product)) &&
            (columnFilters.forecast.length === 0 || columnFilters.forecast.includes(row.forecast)) &&
            (columnFilters.status.length === 0 || columnFilters.status.includes(row.status))
        )
    })

    const visibleData = filteredData.slice(0, displayCount)

    const loadMore = () => {
        if (displayCount < filteredData.length) {
            setDisplayCount((prev) => prev + 20)
        }
    }

    type SelectedColumns = typeof selectedColumns;
    type ColumnKey = keyof SelectedColumns;

    const handleColumnToggle = (column: ColumnKey) => {
        setSelectedColumns((prev) => ({
            ...prev,
            [column]: !prev[column],
        }))
    }

    const handleFilterToggle = (column: keyof typeof columnFilters, value: string) => {
        setColumnFilters((prev) => ({
            ...prev,
            [column]: prev[column].includes(value) ? prev[column].filter((item) => item !== value) : [...prev[column], value],
        }))
    }

    const exportToCSV = () => {
        const headers: string[] = [];
        const rows: (string | number | null)[][] = [];

        if (selectedColumns.date) headers.push("Date")
        if (selectedColumns.region) headers.push("Region")
        if (selectedColumns.product) headers.push("Product")
        if (selectedColumns.revenue) headers.push("Revenue")
        if (selectedColumns.forecast) headers.push("Forecast Method")
        if (selectedColumns.accuracy) headers.push("Accuracy (%)")
        if (selectedColumns.variance) headers.push("Variance (%)")
        if (selectedColumns.status) headers.push("Status")

        filteredData.forEach((row) => {
            const csvRow = []
            if (selectedColumns.date) csvRow.push(row.date)
            if (selectedColumns.region) csvRow.push(row.region)
            if (selectedColumns.product) csvRow.push(row.product)
            if (selectedColumns.revenue) csvRow.push(row.revenue)
            if (selectedColumns.forecast) csvRow.push(row.forecast)
            if (selectedColumns.accuracy) csvRow.push(row.accuracy)
            if (selectedColumns.variance) csvRow.push(row.variance)
            if (selectedColumns.status) csvRow.push(row.status)
            rows.push(csvRow)
        })

        const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `reports_${format(new Date(), "yyyy-MM-dd")}.csv`)
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="border-b pb-4">
                <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                <p className="text-muted-foreground mt-2">View and analyze your forecast reports and performance metrics</p>
            </div>
            <ReportsControlRow
                date={date}
                setDate={setDate}
                filterOpen={filterOpen}
                setFilterOpen={setFilterOpen}
                columnFilters={columnFilters}
                setColumnFilters={setColumnFilters}
                uniqueValues={uniqueValues}
                handleFilterToggle={handleFilterToggle}
                selectedColumns={selectedColumns}
                handleColumnToggle={handleColumnToggle}
                exportToCSV={exportToCSV}
            />
            <ReportsDataTable selectedColumns={selectedColumns} filteredData={visibleData} loadMore={loadMore} />
            <ReportsDataTableFooter filteredData={filteredData} />
        </div>
    )
};