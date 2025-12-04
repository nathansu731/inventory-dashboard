"use client"

import {useState, useMemo} from "react"
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

    const uniqueValues = useMemo(() => ({
        region: [...new Set(reportData.map((item) => item.region))],
        product: [...new Set(reportData.map((item) => item.product))],
        forecast: [...new Set(reportData.map((item) => item.forecast))],
        status: [...new Set(reportData.map((item) => item.status))],
    }), [reportData])

    const filteredData = useMemo(() => {
        return reportData.filter((row) => {
            return (
                (columnFilters.region.length === 0 || columnFilters.region.includes(row.region)) &&
                (columnFilters.product.length === 0 || columnFilters.product.includes(row.product)) &&
                (columnFilters.forecast.length === 0 || columnFilters.forecast.includes(row.forecast)) &&
                (columnFilters.status.length === 0 || columnFilters.status.includes(row.status))
            );
        });
    }, [columnFilters, reportData]);

    const visibleData = useMemo(() => {
        return filteredData.slice(0, displayCount);
    }, [filteredData, displayCount]);

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
        setDisplayCount(20);
    }

    const exportToCSV = () => {
        const columns: { key: keyof typeof selectedColumns; label: string }[] = [
            { key: "date", label: "Date" },
            { key: "region", label: "Region" },
            { key: "product", label: "Product" },
            { key: "revenue", label: "Revenue" },
            { key: "forecast", label: "Forecast Method" },
            { key: "accuracy", label: "Accuracy (%)" },
            { key: "variance", label: "Variance (%)" },
            { key: "status", label: "Status" },
        ]

        const headers = columns
            .filter(col => selectedColumns[col.key])
            .map(col => col.label)

        const rows = filteredData.map(row =>
            columns
                .filter(col => selectedColumns[col.key])
                .map(col => row[col.key])
        )

        const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n")

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
        <div className="min-h-screen bg-background">
            <div className="container max-w-[2000px] mx-auto px-5 py-8 min-w-0">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Reports</h1>
                <p className="text-muted-foreground">View and analyze your forecast reports and performance metrics</p>
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
        </div>
    )
};