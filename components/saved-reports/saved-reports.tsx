"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Play } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Trash2 } from "lucide-react"
import { useState, useMemo } from "react"
import {SavedReportsSearchBar} from "@/components/saved-reports/saved-reports-search-bar";
import {SavedReportsTable} from "@/components/saved-reports/saved-reports-table";

// Sample data for saved reports
const savedReports = [
    {
        id: 1,
        name: "Monthly Sales Report",
        dateRange: "Jan 1, 2024 - Jan 31, 2024",
        category: "Sales",
    },
    {
        id: 2,
        name: "Customer Analytics Q4",
        dateRange: "Oct 1, 2023 - Dec 31, 2023",
        category: "Analytics",
    },
    {
        id: 3,
        name: "Inventory Summary",
        dateRange: "Dec 1, 2023 - Dec 31, 2023",
        category: "Inventory",
    },
    {
        id: 4,
        name: "Financial Overview",
        dateRange: "Nov 1, 2023 - Nov 30, 2023",
        category: "Finance",
    },
    {
        id: 5,
        name: "Marketing Campaign Results",
        dateRange: "Sep 15, 2023 - Oct 15, 2023",
        category: "Marketing",
    },
]

export const SavedReports = () => {
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedReports, setSelectedReports] = useState<number[]>([])

    const filteredReports = useMemo(() => {
        return savedReports.filter(
            (report) =>
                report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                report.category.toLowerCase().includes(searchTerm.toLowerCase()),
        )
    }, [searchTerm])

    const handleDownload = (reportId: number, reportName: string) => {
        console.log(`Downloading report: ${reportName} (ID: ${reportId})`)
    }

    const handleRelaunch = (reportId: number, reportName: string) => {
        console.log(`Relaunching report: ${reportName} (ID: ${reportId})`)
    }

    const handleSelectReport = (reportId: number, checked: boolean) => {
        if (checked) {
            setSelectedReports((prev) => [...prev, reportId])
        } else {
            setSelectedReports((prev) => prev.filter((id) => id !== reportId))
        }
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedReports(filteredReports.map((report) => report.id))
        } else {
            setSelectedReports([])
        }
    }

    const handleBulkDownload = () => {
        console.log(`Bulk downloading reports:`, selectedReports)
        setSelectedReports([])
    }

    const handleBulkDelete = () => {
        console.log(`Bulk deleting reports:`, selectedReports)
        setSelectedReports([])
    }

    const isAllSelected = filteredReports.length > 0 && selectedReports.length === filteredReports.length
    const isIndeterminate = selectedReports.length > 0 && selectedReports.length < filteredReports.length

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Saved Reports</h1>
                <p className="text-muted-foreground mt-2">View and manage your saved reports</p>
            </div>
            <SavedReportsSearchBar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedReports={selectedReports}
                handleBulkDownload={handleBulkDownload}
                handleBulkDelete={handleBulkDelete}
            />
            <SavedReportsTable
                isAllSelected={isAllSelected}
                isIndeterminate={isIndeterminate}
                filteredReports={filteredReports}
                searchTerm={searchTerm}
                selectedReports={selectedReports}
                handleSelectAll={handleSelectAll}
                handleSelectReport={handleSelectReport}
                handleDownload={handleDownload}
                handleRelaunch={handleRelaunch}
            />
        </div>
    )
}
