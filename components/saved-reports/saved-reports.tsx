"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
            return report.name.toLowerCase().includes(q) || status.includes(q) || model.includes(q)
        })
    }, [reports, searchTerm])

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
                <div className="px-6 flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Saved Reports</h1>
                        <p className="text-muted-foreground mt-1">Saved criteria templates. Open one to regenerate with the latest forecast runs.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => void loadReports()} disabled={isLoading}>Refresh</Button>
                        <Button asChild variant="outline">
                            <Link href="/reports">Create Report</Link>
                        </Button>
                    </div>
                </div>

                {error ? (
                    <div className="px-6">
                        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                            Failed to load saved reports. {error}
                        </div>
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
