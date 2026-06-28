import { format } from "date-fns"
import React from "react"
import { Download, Play, Trash2 } from "lucide-react"
import type { CheckedState } from "@radix-ui/react-checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

const formatDate = (value: string | null | undefined) => {
    if (!value) return "-"
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

const percent = (value: number | null | undefined) =>
    typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)}%` : "-"

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
        <Card>
            <CardHeader>
                <CardTitle>Your Saved Report Library</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table className="min-w-[1300px]">
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
                                <TableHead>Criteria</TableHead>
                                <TableHead className="text-right">Runs</TableHead>
                                <TableHead className="text-right">Scenarios</TableHead>
                                <TableHead className="text-right">Avg Accuracy</TableHead>
                                <TableHead className="text-right">Avg sMAPE</TableHead>
                                <TableHead className="text-right">High Error</TableHead>
                                <TableHead className="text-right">Assumption Points</TableHead>
                                <TableHead>Best / Worst</TableHead>
                                <TableHead>Generated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredReports.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
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
                                        <TableCell className="font-medium">
                                            <div>{report.name}</div>
                                            <div className="text-xs text-muted-foreground">Updated {formatDate(report.updatedAt)}</div>
                                        </TableCell>
                                        <TableCell className="max-w-[280px]">
                                            <div className="flex flex-wrap gap-1">
                                                <Badge variant="outline">Status {toLabel(report.criteria.status)}</Badge>
                                                <Badge variant="outline">Model {toLabel(report.criteria.model)}</Badge>
                                            </div>
                                            <div className="mt-1 text-xs text-muted-foreground">
                                                {report.criteria.searchText || "Any query"} · {dateRangeLabel(report.criteria.dateFrom, report.criteria.dateTo)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">{report.snapshot?.runCount ?? "-"}</TableCell>
                                        <TableCell className="text-right">{report.snapshot?.scenarioCount ?? "-"}</TableCell>
                                        <TableCell className="text-right">{percent(report.snapshot?.averageAccuracy)}</TableCell>
                                        <TableCell className="text-right">{percent(report.snapshot?.averageSmape)}</TableCell>
                                        <TableCell className="text-right">{report.snapshot?.highErrorSeries ?? "-"}</TableCell>
                                        <TableCell className="text-right">{report.snapshot?.assumptionsAffected ?? "-"}</TableCell>
                                        <TableCell>
                                            <div className="text-xs">
                                                <div>Best: {report.snapshot?.bestRunId ?? "-"}</div>
                                                <div className="text-muted-foreground">Worst: {report.snapshot?.worstRunId ?? "-"}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{formatDate(report.snapshot?.generatedAt)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleDownload(report)} className="h-8 w-8 p-0">
                                                    <Download className="h-4 w-4" />
                                                    <span className="sr-only">Download criteria {report.name}</span>
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => handleRunNow(report.id)} className="h-8 w-8 p-0">
                                                    <Play className="h-4 w-4" />
                                                    <span className="sr-only">Open {report.name}</span>
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
                </div>
            </CardContent>
        </Card>
    )
}
