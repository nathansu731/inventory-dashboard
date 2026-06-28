"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SavedReportsSearchBar } from "@/components/saved-reports/saved-reports-search-bar"
import { SavedReportsTable } from "@/components/saved-reports/saved-reports-table"
import { deleteSavedReports, readAllSavedReports, type SavedReportDefinition } from "@/lib/saved-reports"

export const SavedReports = () => {
    const router = useRouter()

    const [reports, setReports] = useState<SavedReportDefinition[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedReports, setSelectedReports] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const loadReports = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const all = await readAllSavedReports()
            setReports(all)
        } catch (e) {
            setReports([])
            setError(e instanceof Error ? e.message : "failed_loading_saved_reports")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        void loadReports()
    }, [])

    const filteredReports = useMemo(() => {
        const q = searchTerm.trim().toLowerCase()
        if (!q) return reports
        return reports.filter((report) => {
            const status = report.criteria.status.toLowerCase()
            const model = report.criteria.model.toLowerCase()
            return (
                report.name.toLowerCase().includes(q) ||
                status.includes(q) ||
                model.includes(q) ||
                (report.snapshot?.bestRunId ?? "").toLowerCase().includes(q) ||
                (report.snapshot?.worstRunId ?? "").toLowerCase().includes(q)
            )
        })
    }, [reports, searchTerm])

    const stats = useMemo(() => {
        const reportCount = reports.length
        const totalRuns = reports.reduce((sum, report) => sum + (report.snapshot?.runCount ?? 0), 0)
        const totalScenarios = reports.reduce((sum, report) => sum + (report.snapshot?.scenarioCount ?? 0), 0)
        const highErrorSeries = reports.reduce((sum, report) => sum + (report.snapshot?.highErrorSeries ?? 0), 0)
        const accuracyValues = reports
            .map((report) => report.snapshot?.averageAccuracy)
            .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
        const avgAccuracy =
            accuracyValues.length > 0 ? accuracyValues.reduce((sum, value) => sum + value, 0) / accuracyValues.length : null
        return { reportCount, totalRuns, totalScenarios, highErrorSeries, avgAccuracy }
    }, [reports])

    const filteredIds = useMemo(() => filteredReports.map((report) => report.id), [filteredReports])
    const selectedInView = useMemo(() => selectedReports.filter((id) => filteredIds.includes(id)), [filteredIds, selectedReports])

    const handleRunNow = (reportId: string) => {
        router.push(`/reports?reportId=${encodeURIComponent(reportId)}`)
    }

    const handleDownloadCriteria = (report: SavedReportDefinition) => {
        const content = JSON.stringify(report, null, 2)
        const blob = new Blob([content], { type: "application/json;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.setAttribute("download", `${report.name.replace(/\s+/g, "-").toLowerCase()}-criteria.json`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    const handleSelectReport = (reportId: string, checked: boolean) => {
        if (checked) {
            setSelectedReports((prev) => (prev.includes(reportId) ? prev : [...prev, reportId]))
        } else {
            setSelectedReports((prev) => prev.filter((id) => id !== reportId))
        }
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedReports((prev) => {
                const set = new Set([...prev, ...filteredIds])
                return Array.from(set)
            })
            return
        }
        setSelectedReports((prev) => prev.filter((id) => !filteredIds.includes(id)))
    }

    const handleBulkDownload = () => {
        const selected = reports.filter((r) => selectedReports.includes(r.id))
        if (selected.length === 0) return
        const content = JSON.stringify(selected, null, 2)
        const blob = new Blob([content], { type: "application/json;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.setAttribute("download", `saved-report-criteria-${new Date().toISOString().slice(0, 10)}.json`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    const handleBulkDelete = async () => {
        if (selectedReports.length === 0) return
        try {
            await deleteSavedReports(selectedReports)
            await loadReports()
            setSelectedReports([])
        } catch (e) {
            setError(e instanceof Error ? e.message : "failed_delete_saved_reports")
        }
    }

    const handleDeleteOne = async (reportId: string) => {
        try {
            await deleteSavedReports([reportId])
            await loadReports()
            setSelectedReports((prev) => prev.filter((id) => id !== reportId))
        } catch (e) {
            setError(e instanceof Error ? e.message : "failed_delete_saved_report")
        }
    }

    const isAllSelected = filteredReports.length > 0 && selectedInView.length === filteredReports.length
    const isIndeterminate = selectedInView.length > 0 && selectedInView.length < filteredReports.length

    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-[2000px] mx-auto p-5 min-w-0 space-y-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Saved Reports</h1>
                        <p className="text-muted-foreground mt-1">Saved report definitions with reusable criteria and captured run portfolio snapshots.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => void loadReports()} disabled={isLoading}>Refresh</Button>
                        <Button asChild variant="outline">
                            <Link href="/reports">Create Report</Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <Card><CardHeader className="pb-2"><CardDescription>Saved Reports</CardDescription><CardTitle>{stats.reportCount}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Reusable report definitions</CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>Captured Runs</CardDescription><CardTitle>{stats.totalRuns}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Runs represented in snapshots</CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>Scenario Runs</CardDescription><CardTitle>{stats.totalScenarios}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Edited child runs captured</CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>Avg Accuracy</CardDescription><CardTitle>{typeof stats.avgAccuracy === "number" ? `${stats.avgAccuracy.toFixed(1)}%` : "-"}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Across saved snapshots</CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>High Error Series</CardDescription><CardTitle>{stats.highErrorSeries}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Stored exception count</CardContent></Card>
                </div>

                {error ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                        Failed to load saved reports. {error}
                    </div>
                ) : null}

                <SavedReportsSearchBar
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    selectedReports={selectedReports}
                    handleBulkDownload={handleBulkDownload}
                    handleBulkDelete={() => void handleBulkDelete()}
                />

                {isLoading && reports.length === 0 ? (
                    <div className="px-6 text-sm text-muted-foreground">Loading saved reports...</div>
                ) : (
                    <SavedReportsTable
                        isAllSelected={isAllSelected}
                        isIndeterminate={isIndeterminate}
                        filteredReports={filteredReports}
                        searchTerm={searchTerm}
                        selectedReports={selectedReports}
                        handleSelectAll={handleSelectAll}
                        handleSelectReport={handleSelectReport}
                        handleDownload={handleDownloadCriteria}
                        handleRunNow={handleRunNow}
                        handleDeleteOne={(id) => void handleDeleteOne(id)}
                    />
                )}
            </div>
        </div>
    )
}
