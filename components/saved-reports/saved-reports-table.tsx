import { format } from "date-fns"
import React from "react"
import { Download, Play, Trash2 } from "lucide-react"
import type { CheckedState } from "@radix-ui/react-checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import type { SavedReportDefinition } from "@/lib/saved-reports"

type SavedReportsTableProps = {
    isAllSelected: boolean
    handleSelectAll: (checked: boolean) => void
    isIndeterminate: boolean
    filteredReports: SavedReportDefinition[]
    searchTerm: string
    selectedReports: string[]
    handleSelectReport: (reportId: string, checked: boolean) => void
    handleDownload: (report: SavedReportDefinition) => void
    handleRunNow: (reportId: string) => void
    handleDeleteOne: (reportId: string) => void
}

const formatDate = (value: string) => {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return "-"
    return format(parsed, "yyyy-MM-dd HH:mm")
}

const toLabel = (value: string) => {
    if (!value || value === "all") return "Any"
    return value
}

const dateRangeLabel = (from: string, to: string) => {
    if (!from && !to) return "Any"
    return `${from || "..."} to ${to || "..."}`
}

export const SavedReportsTable = ({
    isAllSelected,
    handleSelectAll,
    isIndeterminate,
    filteredReports,
    searchTerm,
    selectedReports,
    handleSelectReport,
    handleDownload,
    handleRunNow,
    handleDeleteOne,
}: SavedReportsTableProps) => {
    const selectAllState: CheckedState = isIndeterminate ? "indeterminate" : isAllSelected

    return (
        <div className="px-6">
            <Card>
                <CardHeader>
                    <CardTitle>Your Saved Report Criteria</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={selectAllState}
                                        onCheckedChange={(checked) => handleSelectAll(checked === true)}
                                        aria-label="Select all reports"
                                    />
                                </TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Query</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Model</TableHead>
                                <TableHead>Date Range</TableHead>
                                <TableHead>Updated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredReports.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        {searchTerm ? `No saved reports matching "${searchTerm}"` : "No saved reports yet"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredReports.map((report) => (
                                    <TableRow key={report.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedReports.includes(report.id)}
                                                onCheckedChange={(checked) => handleSelectReport(report.id, checked === true)}
                                                aria-label={`Select ${report.name}`}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{report.name}</TableCell>
                                        <TableCell className="max-w-[220px] truncate" title={report.criteria.searchText || "Any"}>
                                            {report.criteria.searchText || "Any"}
                                        </TableCell>
                                        <TableCell>{toLabel(report.criteria.status)}</TableCell>
                                        <TableCell>{toLabel(report.criteria.model)}</TableCell>
                                        <TableCell>{dateRangeLabel(report.criteria.dateFrom, report.criteria.dateTo)}</TableCell>
                                        <TableCell className="text-muted-foreground">{formatDate(report.updatedAt)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleDownload(report)} className="h-8 w-8 p-0">
                                                    <Download className="h-4 w-4" />
                                                    <span className="sr-only">Download criteria {report.name}</span>
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => handleRunNow(report.id)} className="h-8 w-8 p-0">
                                                    <Play className="h-4 w-4" />
                                                    <span className="sr-only">Run {report.name}</span>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDeleteOne(report.id)}
                                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="sr-only">Delete {report.name}</span>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
