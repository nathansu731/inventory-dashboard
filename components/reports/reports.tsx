"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { Download, RefreshCw, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { defaultSavedReportCriteria, findSavedReport, upsertSavedReport, type SavedReportCriteria } from "@/lib/saved-reports"

type RunItem = {
    runId: string
    tenantId: string
    status: string
    createdAt?: string
    updatedAt?: string
    s3OutputPrefix?: string
    summary?: string | Record<string, unknown>
}

type ReportRow = {
    runId: string
    status: string
    createdAt: string
    createdAtRaw?: string
    updatedAt: string
    totalSkus: number | null
    period: string
    model: string
    smape: number | null
}

const parseSummary = (summary: RunItem["summary"]) => {
    if (!summary) return null
    if (typeof summary === "string") {
        try {
            return JSON.parse(summary) as Record<string, unknown>
        } catch {
            return null
        }
    }
    return summary
}

const safeDate = (value?: string) => {
    if (!value) return "-"
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return format(d, "yyyy-MM-dd HH:mm")
}

const withinDateRange = (iso: string | undefined, from: string, to: string) => {
    if (!iso) return true
    if (!from && !to) return true
    const t = new Date(iso).getTime()
    if (Number.isNaN(t)) return true

    if (from) {
        const fromT = new Date(`${from}T00:00:00`).getTime()
        if (t < fromT) return false
    }
    if (to) {
        const toT = new Date(`${to}T23:59:59`).getTime()
        if (t > toT) return false
    }
    return true
}

export const ReportsPage = () => {
    const searchParams = useSearchParams()

    const [rows, setRows] = useState<ReportRow[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    const [criteria, setCriteria] = useState<SavedReportCriteria>(defaultSavedReportCriteria())
    const [reportName, setReportName] = useState("")
    const [activeReportId, setActiveReportId] = useState<string | null>(null)
    const [saveMessage, setSaveMessage] = useState<string | null>(null)

    const fetchRuns = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/list-forecast-runs?limit=100", { cache: "no-store" })
            if (!res.ok) throw new Error(`API error (${res.status})`)
            const payload = await res.json()
            const items = (payload?.items ?? []) as RunItem[]

            const mapped: ReportRow[] = items.map((item) => {
                const summary = parseSummary(item.summary)
                const totalSkus = typeof summary?.totalSkus === "number" ? summary.totalSkus : null
                const dateStart = typeof summary?.dateStart === "string" ? summary.dateStart : null
                const dateEnd = typeof summary?.dateEnd === "string" ? summary.dateEnd : null

                const validation = (summary?.validation as Record<string, unknown> | undefined) ?? undefined
                const selectedModel = (validation?.selectedModel as Record<string, unknown> | undefined) ?? undefined
                const metrics = (selectedModel?.metrics as Record<string, unknown> | undefined) ?? undefined

                const model = typeof selectedModel?.model === "string" ? selectedModel.model : "-"
                const smape = typeof metrics?.smape === "number" ? metrics.smape : null

                return {
                    runId: item.runId,
                    status: item.status || "UNKNOWN",
                    createdAt: safeDate(item.createdAt),
                    createdAtRaw: item.createdAt,
                    updatedAt: safeDate(item.updatedAt),
                    totalSkus,
                    period: dateStart && dateEnd ? `${dateStart} to ${dateEnd}` : "-",
                    model,
                    smape,
                }
            })

            setRows(mapped)
        } catch (e) {
            setRows([])
            setError(e instanceof Error ? e.message : "Failed to load reports")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchRuns()
    }, [fetchRuns])

    useEffect(() => {
        const reportId = searchParams.get("reportId")
        if (!reportId) return

        let cancelled = false

        ;(async () => {
            try {
                const saved = await findSavedReport(reportId)
                if (cancelled) return
                if (!saved) {
                    setSaveMessage(`Saved report ${reportId} was not found.`)
                    return
                }

                setCriteria(saved.criteria)
                setReportName(saved.name)
                setActiveReportId(saved.id)
                setSaveMessage(`Loaded saved report: ${saved.name}`)
            } catch (e) {
                if (cancelled) return
                setSaveMessage(`Failed to load saved report (${e instanceof Error ? e.message : "unknown_error"}).`)
            }
        })()

        return () => {
            cancelled = true
        }
    }, [searchParams])

    const statuses = useMemo(() => Array.from(new Set(rows.map((r) => r.status))).sort(), [rows])
    const models = useMemo(() => Array.from(new Set(rows.map((r) => r.model).filter((m) => m && m !== "-"))).sort(), [rows])

    const filteredRows = useMemo(() => {
        const q = criteria.searchText.trim().toLowerCase()
        return rows.filter((row) => {
            const statusMatch = criteria.status === "all" || row.status === criteria.status
            const modelMatch = criteria.model === "all" || row.model === criteria.model
            const dateMatch = withinDateRange(row.createdAtRaw, criteria.dateFrom, criteria.dateTo)
            if (!statusMatch || !modelMatch || !dateMatch) return false
            if (!q) return true
            return (
                row.runId.toLowerCase().includes(q) ||
                row.status.toLowerCase().includes(q) ||
                row.model.toLowerCase().includes(q) ||
                row.period.toLowerCase().includes(q)
            )
        })
    }, [rows, criteria])

    const exportToCSV = () => {
        if (filteredRows.length === 0) return

        const headers = ["Run ID", "Status", "Created At", "Updated At", "Total SKUs", "Data Period", "Model", "SMAPE"]
        const csvRows = filteredRows.map((r) => [
            r.runId,
            r.status,
            r.createdAt,
            r.updatedAt,
            r.totalSkus ?? "",
            r.period,
            r.model,
            r.smape ?? "",
        ])
        const csv = [headers.join(","), ...csvRows.map((r) => r.join(","))].join("\n")

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.setAttribute("download", `forecast-runs-${format(new Date(), "yyyy-MM-dd")}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    const handleSaveReport = async () => {
        const trimmedName = reportName.trim()
        if (!trimmedName) return

        setIsSaving(true)
        try {
            const saved = await upsertSavedReport({
                id: activeReportId ?? undefined,
                name: trimmedName,
                criteria,
            })
            setActiveReportId(saved.id)
            setSaveMessage(`Saved at ${safeDate(saved.updatedAt)}`)
        } catch (e) {
            setSaveMessage(`Save failed (${e instanceof Error ? e.message : "unknown_error"}).`)
        } finally {
            setIsSaving(false)
        }
    }

    const resetCriteria = () => {
        setCriteria(defaultSavedReportCriteria())
        setActiveReportId(null)
        setReportName("")
        setSaveMessage(null)
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-[2000px] mx-auto p-5 min-w-0 space-y-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
                        <p className="text-muted-foreground">Define report criteria, preview matching runs, and save the criteria for reuse.</p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href="/reports/saved-reports">Open Saved Reports</Link>
                    </Button>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
                        <Input
                            placeholder="Search by run ID, status, model or period"
                            value={criteria.searchText}
                            onChange={(e) => setCriteria((prev) => ({ ...prev, searchText: e.target.value }))}
                        />
                        <Select value={criteria.status} onValueChange={(v) => setCriteria((prev) => ({ ...prev, status: v }))}>
                            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All statuses</SelectItem>
                                {statuses.map((status) => (
                                    <SelectItem key={status} value={status}>{status}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={criteria.model} onValueChange={(v) => setCriteria((prev) => ({ ...prev, model: v }))}>
                            <SelectTrigger><SelectValue placeholder="Model" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All models</SelectItem>
                                {models.map((model) => (
                                    <SelectItem key={model} value={model}>{model}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            type="date"
                            value={criteria.dateFrom}
                            onChange={(e) => setCriteria((prev) => ({ ...prev, dateFrom: e.target.value }))}
                        />
                        <Input
                            type="date"
                            value={criteria.dateTo}
                            onChange={(e) => setCriteria((prev) => ({ ...prev, dateTo: e.target.value }))}
                        />
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <Input
                                className="w-full md:w-[280px]"
                                placeholder="Report name"
                                value={reportName}
                                onChange={(e) => setReportName(e.target.value)}
                            />
                            <Button onClick={handleSaveReport} disabled={!reportName.trim() || isSaving}>
                                <Save className="h-4 w-4 mr-2" />
                                {activeReportId ? "Update Saved Report" : "Save Report"}
                            </Button>
                            <Button variant="ghost" onClick={resetCriteria}>
                                <X className="h-4 w-4 mr-2" />
                                Reset
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={fetchRuns} disabled={isLoading} aria-label="Refresh">
                                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                            </Button>
                            <Button variant="outline" size="icon" onClick={exportToCSV} disabled={filteredRows.length === 0} aria-label="Export reports">
                                <Download className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    {saveMessage ? <p className="text-sm text-muted-foreground">{saveMessage}</p> : null}
                </div>

                {error ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                        Failed to load reports. {error}
                    </div>
                ) : filteredRows.length === 0 ? (
                    <div className="rounded-md border bg-muted/30 p-8 text-center">
                        <p className="text-base font-medium">No reports for current criteria</p>
                        <p className="text-sm text-muted-foreground mt-1">Adjust filters or run new forecasts to generate report output.</p>
                    </div>
                ) : (
                    <div className="rounded-lg border overflow-auto">
                        <Table className="min-w-[900px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Run ID</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created At</TableHead>
                                    <TableHead>Updated At</TableHead>
                                    <TableHead className="text-right">Total SKUs</TableHead>
                                    <TableHead>Data Period</TableHead>
                                    <TableHead>Model</TableHead>
                                    <TableHead className="text-right">SMAPE</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRows.map((row) => (
                                    <TableRow key={row.runId}>
                                        <TableCell className="font-medium">{row.runId}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    row.status === "DONE"
                                                        ? "default"
                                                        : row.status === "FAILED"
                                                          ? "destructive"
                                                          : "secondary"
                                                }
                                            >
                                                {row.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{row.createdAt}</TableCell>
                                        <TableCell>{row.updatedAt}</TableCell>
                                        <TableCell className="text-right">{row.totalSkus ?? "-"}</TableCell>
                                        <TableCell>{row.period}</TableCell>
                                        <TableCell>{row.model}</TableCell>
                                        <TableCell className="text-right">{row.smape ?? "-"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <div className="text-sm text-muted-foreground">
                    Showing {filteredRows.length} of {rows.length} runs
                </div>
            </div>
        </div>
    )
}
