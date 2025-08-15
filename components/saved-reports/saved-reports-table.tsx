import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Checkbox} from "@/components/ui/checkbox";
import {Button} from "@/components/ui/button";
import {Download, Play} from "lucide-react";
import React from "react";

type FilteredReports = {
    id: number;
    name: string;
    dateRange: string;
    category: string;
}

type SavedReportsTableProps = {
    isAllSelected: boolean,
    handleSelectAll: (checked: boolean) => void,
    isIndeterminate: boolean,
    filteredReports: FilteredReports[],
    searchTerm: string
    selectedReports: number[],
    handleSelectReport: (reportId: number, checked: boolean) => void,
    handleDownload: (reportId: number, reportName: string) => void;
    handleRelaunch: (reportId: number, reportName: string) => void;
}

export const SavedReportsTable = ({isAllSelected, handleSelectAll, isIndeterminate, filteredReports, searchTerm, selectedReports, handleSelectReport, handleDownload, handleRelaunch }: SavedReportsTableProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Your Reports</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">
                                <Checkbox
                                    checked={isAllSelected}
                                    onCheckedChange={handleSelectAll}
                                    aria-label="Select all reports"
                                    {...(isIndeterminate && { "data-state": "indeterminate" })}
                                />
                            </TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Date Range</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredReports.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    {searchTerm ? `No reports found matching "${searchTerm}"` : "No reports found"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredReports.map((report) => (
                                <TableRow key={report.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedReports.includes(report.id)}
                                            onCheckedChange={(checked) => handleSelectReport(report.id, checked as boolean)}
                                            aria-label={`Select ${report.name}`}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">{report.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{report.dateRange}</TableCell>
                                    <TableCell>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                        {report.category}
                      </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDownload(report.id, report.name)}
                                                className="h-8 w-8 p-0"
                                            >
                                                <Download className="h-4 w-4" />
                                                <span className="sr-only">Download {report.name}</span>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleRelaunch(report.id, report.name)}
                                                className="h-8 w-8 p-0"
                                            >
                                                <Play className="h-4 w-4" />
                                                <span className="sr-only">Relaunch {report.name}</span>
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
    )
}