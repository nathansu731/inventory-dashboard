"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import {
    AlertTriangle,
    BarChart3,
    Download,
    GitBranch,
    RefreshCw,
    Save,
    Target,
    TrendingDown,
    X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    defaultSavedReportCriteria,
    findSavedReport,
    upsertSavedReport,
    type SavedReportCriteria,
    type SavedReportSnapshot,
} from "@/lib/saved-reports"
import { useForecastCopilot } from "@/components/copilot/forecast-copilot-provider"

type RunItem = {
    runId: string
    tenantId: string
    snapshotId?: string | null
    parentRunId?: string | null
    isScenario?: boolean
    scenarioLabel?: string | null
    editedAt?: string | null
    editedCellCount?: number | null
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
    totalSeries: number | null
    rowCount: number | null
    period: string
    model: string
    mode: string
    frequency: string
    smape: number | null
    accuracy: number | null
    mae: number | null
    rmse: number | null
    validationWindows: number | null
    highErrorSeries: number
    worstSeriesSmape: number | null
    assumptionsAffected: number
    assumptionDelta: number
    isScenario: boolean
    parentRunId: string | null
    scenarioLabel: string | null
    editedCellCount: number | null
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

const getObject = (value: unknown) => (typeof value === "object" && value ? (value as Record<string, unknown>) : null)
const toNumber = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null)

const safeDate = (value?: string | null) => {
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

const round = (value: number, digits = 2) => {
    const factor = 10 ** digits
    return Math.round(value * factor) / factor
}

const formatPercent = (value: number | null, digits = 1) =>
    typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(digits)}%` : "-"

const formatNumber = (value: number | null, digits = 0) =>
    typeof value === "number" && Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: digits }) : "-"

const getRunRow = (item: RunItem): ReportRow => {
    const summary = parseSummary(item.summary)
    const validation = getObject(summary?.validation)
    const selectedModel = getObject(validation?.selectedModel)
    const metrics = getObject(selectedModel?.metrics)
    const runConfig = getObject(summary?.runConfig)
    const futureAssumptions = getObject(summary?.futureAssumptionsDiagnostics)
    const dailyImpact = getObject(futureAssumptions?.dailyForecastImpact)
    const perSeries = Array.isArray(selectedModel?.perSeries) ? selectedModel.perSeries : []
    const perSeriesSmapes = perSeries
        .map((series) => toNumber(getObject(series)?.metrics && getObject(getObject(series)?.metrics)?.smape))
        .filter((value): value is number => typeof value === "number")

    const smape = toNumber(metrics?.smape)
    const accuracy = smape === null ? null : Math.max(0, 100 - smape)
    const totalSkus = toNumber(summary?.totalSkus)
    const totalSeries = toNumber(summary?.totalSeries) ?? toNumber(selectedModel?.seriesCount)
    const dateStart = typeof summary?.dateStart === "string" ? summary.dateStart : null
    const dateEnd = typeof summary?.dateEnd === "string" ? summary.dateEnd : null

    return {
        runId: item.runId,
        status: item.status || "UNKNOWN",
        createdAt: safeDate(item.createdAt),
        createdAtRaw: item.createdAt,
        updatedAt: safeDate(item.updatedAt),
        totalSkus,
        totalSeries,
        rowCount: toNumber(summary?.rows),
        period: dateStart && dateEnd ? `${dateStart} to ${dateEnd}` : "-",
        model:
            typeof selectedModel?.model === "string"
                ? selectedModel.model
                : typeof runConfig?.executedModel === "string"
                  ? runConfig.executedModel
                  : "-",
        mode:
            typeof selectedModel?.mode === "string"
                ? selectedModel.mode
                : typeof runConfig?.executedMode === "string"
                  ? runConfig.executedMode
                  : "-",
        frequency: typeof runConfig?.detectedFrequency === "string" ? runConfig.detectedFrequency : "-",
        smape,
        accuracy,
        mae: toNumber(metrics?.mae),
        rmse: toNumber(metrics?.rmse),
        validationWindows: toNumber(selectedModel?.windows),
        highErrorSeries: perSeriesSmapes.filter((value) => value >= 30).length,
        worstSeriesSmape: perSeriesSmapes.length > 0 ? Math.max(...perSeriesSmapes) : null,
        assumptionsAffected: toNumber(dailyImpact?.affectedItemCount) ?? 0,
        assumptionDelta: toNumber(dailyImpact?.totalAbsoluteForecastDelta) ?? 0,
        isScenario: Boolean(item.isScenario),
        parentRunId: item.parentRunId || null,
        scenarioLabel: item.scenarioLabel || null,
        editedCellCount: typeof item.editedCellCount === "number" ? item.editedCellCount : null,
    }
}

export const ReportsPage = () => {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { setCopilotContext } = useForecastCopilot()

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
            setRows(items.map(getRunRow))
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
                row.mode.toLowerCase().includes(q) ||
                row.frequency.toLowerCase().includes(q) ||
                row.period.toLowerCase().includes(q) ||
                (row.parentRunId ?? "").toLowerCase().includes(q) ||
                (row.scenarioLabel ?? "").toLowerCase().includes(q)
            )
        })
    }, [rows, criteria])

    const stats = useMemo(() => {
        const doneCount = filteredRows.filter((row) => row.status === "DONE").length
        const failedCount = filteredRows.filter((row) => row.status === "FAILED").length
        const scenarioCount = filteredRows.filter((row) => row.isScenario).length
        const smapeValues = filteredRows.map((row) => row.smape).filter((value): value is number => typeof value === "number")
        const accuracyValues = filteredRows.map((row) => row.accuracy).filter((value): value is number => typeof value === "number")
        const totalSeries = filteredRows.reduce((sum, row) => sum + (row.totalSeries ?? 0), 0)
        const highErrorSeries = filteredRows.reduce((sum, row) => sum + row.highErrorSeries, 0)
        const assumptionsAffected = filteredRows.reduce((sum, row) => sum + row.assumptionsAffected, 0)
        const assumptionDelta = filteredRows.reduce((sum, row) => sum + row.assumptionDelta, 0)
        const bestRun = filteredRows
            .filter((row) => typeof row.accuracy === "number")
            .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))[0]
        const worstRun = filteredRows
            .filter((row) => typeof row.smape === "number")
            .sort((a, b) => (b.smape ?? 0) - (a.smape ?? 0))[0]
        return {
            runCount: filteredRows.length,
            doneCount,
            failedCount,
            scenarioCount,
            successRate: filteredRows.length > 0 ? (doneCount / filteredRows.length) * 100 : null,
            averageSmape: smapeValues.length > 0 ? smapeValues.reduce((sum, value) => sum + value, 0) / smapeValues.length : null,
            averageAccuracy: accuracyValues.length > 0 ? accuracyValues.reduce((sum, value) => sum + value, 0) / accuracyValues.length : null,
            averageTotalSkus:
                filteredRows.length > 0
                    ? filteredRows.reduce((sum, row) => sum + (row.totalSkus ?? 0), 0) / filteredRows.length
                    : null,
            totalSeries,
            highErrorSeries,
            assumptionsAffected,
            assumptionDelta,
            bestRun,
            worstRun,
        }
    }, [filteredRows])

    const modelBreakdown = useMemo(() => {
        const map = new Map<string, { model: string; runs: number; smapeTotal: number; smapeCount: number; scenarios: number }>()
        filteredRows.forEach((row) => {
            const key = row.model || "-"
            const current = map.get(key) ?? { model: key, runs: 0, smapeTotal: 0, smapeCount: 0, scenarios: 0 }
            current.runs += 1
            if (typeof row.smape === "number") {
                current.smapeTotal += row.smape
                current.smapeCount += 1
            }
            if (row.isScenario) current.scenarios += 1
            map.set(key, current)
        })
        return Array.from(map.values()).sort((a, b) => b.runs - a.runs)
    }, [filteredRows])

    useEffect(() => {
        const leadRun = filteredRows[0] ?? null
        setCopilotContext({
            runId: leadRun?.runId ?? null,
            pageId: "reports",
            route: pathname || "/reports",
            contextMode: "analysis",
        })

        return () => setCopilotContext(null)
    }, [filteredRows, pathname, setCopilotContext])

    const exportToCSV = () => {
        if (filteredRows.length === 0) return

        const headers = [
            "Run ID",
            "Status",
            "Created At",
            "Updated At",
            "Scenario",
            "Parent Run",
            "Edited Cells",
            "Total SKUs",
            "Total Series",
            "Rows",
            "Data Period",
            "Model",
            "Mode",
            "Frequency",
            "Accuracy",
            "SMAPE",
            "MAE",
            "RMSE",
            "High Error Series",
            "Assumption Points",
            "Assumption Delta",
        ]
        const csvRows = filteredRows.map((r) => [
            r.runId,
            r.status,
            r.createdAt,
            r.updatedAt,
            r.isScenario ? "yes" : "no",
            r.parentRunId ?? "",
            r.editedCellCount ?? "",
            r.totalSkus ?? "",
            r.totalSeries ?? "",
            r.rowCount ?? "",
            r.period,
            r.model,
            r.mode,
            r.frequency,
            r.accuracy ?? "",
            r.smape ?? "",
            r.mae ?? "",
            r.rmse ?? "",
            r.highErrorSeries,
            r.assumptionsAffected,
            r.assumptionDelta,
        ])
        const csv = [headers.join(","), ...csvRows.map((r) => r.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))].join("\n")

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.setAttribute("download", `forecast-run-report-${format(new Date(), "yyyy-MM-dd")}.csv`)
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
            const createdAtValues = filteredRows
                .map((row) => row.createdAtRaw)
                .filter((value): value is string => typeof value === "string" && value.length > 0)
                .sort()

            const snapshot: SavedReportSnapshot = {
                runCount: stats.runCount,
                doneCount: stats.doneCount,
                failedCount: stats.failedCount,
                scenarioCount: stats.scenarioCount,
                averageSmape: stats.averageSmape === null ? null : round(stats.averageSmape, 4),
                averageAccuracy: stats.averageAccuracy === null ? null : round(stats.averageAccuracy, 2),
                averageTotalSkus: stats.averageTotalSkus === null ? null : round(stats.averageTotalSkus, 2),
                totalSeries: stats.totalSeries,
                highErrorSeries: stats.highErrorSeries,
                assumptionsAffected: stats.assumptionsAffected,
                assumptionDelta: round(stats.assumptionDelta, 2),
                bestRunId: stats.bestRun?.runId ?? null,
                worstRunId: stats.worstRun?.runId ?? null,
                periodStart: createdAtValues[0] ?? null,
                periodEnd: createdAtValues.length > 0 ? createdAtValues[createdAtValues.length - 1] : null,
                generatedAt: new Date().toISOString(),
            }

            const saved = await upsertSavedReport({
                id: activeReportId ?? undefined,
                name: trimmedName,
                criteria,
                snapshot,
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
                        <p className="text-muted-foreground">Analyze forecast runs, scenarios, validation quality, and planning exceptions.</p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href="/reports/saved-reports">Open Saved Reports</Link>
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <Card><CardHeader className="pb-2"><CardDescription>Runs</CardDescription><CardTitle>{stats.runCount}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{formatPercent(stats.successRate)} success rate</CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>Accuracy Index</CardDescription><CardTitle>{formatPercent(stats.averageAccuracy)}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Average across matched runs</CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>sMAPE</CardDescription><CardTitle>{formatPercent(stats.averageSmape)}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Lower is better</CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>Scenarios</CardDescription><CardTitle>{stats.scenarioCount}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Edited child runs</CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>High Error Series</CardDescription><CardTitle>{stats.highErrorSeries}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Per-series sMAPE at or above 30%</CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>Assumption Impact</CardDescription><CardTitle>{stats.assumptionsAffected}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{formatNumber(stats.assumptionDelta)} units changed</CardContent></Card>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
                        <Input
                            placeholder="Search run, scenario, model, mode, period"
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
                                    <SelectItem key={model} value={model}>{model.toUpperCase()}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input type="date" value={criteria.dateFrom} onChange={(e) => setCriteria((prev) => ({ ...prev, dateFrom: e.target.value }))} />
                        <Input type="date" value={criteria.dateTo} onChange={(e) => setCriteria((prev) => ({ ...prev, dateTo: e.target.value }))} />
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <Input className="w-full md:w-[280px]" placeholder="Report name" value={reportName} onChange={(e) => setReportName(e.target.value)} />
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

                <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <BarChart3 className="h-4 w-4" />
                                Model Breakdown
                            </CardTitle>
                            <CardDescription>Volume, scenario usage, and average error by model.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {modelBreakdown.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No model data for current criteria.</div>
                            ) : (
                                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                    {modelBreakdown.map((item) => (
                                        <div key={item.model} className="rounded-md border p-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-medium">{item.model.toUpperCase()}</span>
                                                <Badge variant="secondary">{item.runs} runs</Badge>
                                            </div>
                                            <div className="mt-2 text-sm text-muted-foreground">
                                                Avg sMAPE {item.smapeCount > 0 ? formatPercent(item.smapeTotal / item.smapeCount) : "-"} · {item.scenarios} scenarios
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Target className="h-4 w-4" />
                                Report Insights
                            </CardTitle>
                            <CardDescription>Planner-facing highlights from the filtered run set.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-start gap-2">
                                <TrendingDown className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                <div>Best accuracy run: <span className="font-medium">{stats.bestRun?.runId ?? "-"}</span> {stats.bestRun?.accuracy ? `(${stats.bestRun.accuracy.toFixed(1)}%)` : ""}</div>
                            </div>
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                <div>Worst error run: <span className="font-medium">{stats.worstRun?.runId ?? "-"}</span> {stats.worstRun?.smape ? `(${stats.worstRun.smape.toFixed(1)}% sMAPE)` : ""}</div>
                            </div>
                            <div className="flex items-start gap-2">
                                <GitBranch className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                <div>{stats.scenarioCount} scenario runs are included in this report scope.</div>
                            </div>
                        </CardContent>
                    </Card>
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
                        <Table className="min-w-[1450px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Run</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Scenario</TableHead>
                                    <TableHead>Model</TableHead>
                                    <TableHead>Mode</TableHead>
                                    <TableHead>Freq</TableHead>
                                    <TableHead className="text-right">Accuracy</TableHead>
                                    <TableHead className="text-right">sMAPE</TableHead>
                                    <TableHead className="text-right">MAE</TableHead>
                                    <TableHead className="text-right">RMSE</TableHead>
                                    <TableHead className="text-right">Series</TableHead>
                                    <TableHead className="text-right">High Error</TableHead>
                                    <TableHead className="text-right">Assumption Points</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRows.map((row) => (
                                    <TableRow key={row.runId}>
                                        <TableCell className="font-medium">
                                            <div>{row.runId}</div>
                                            <div className="text-xs text-muted-foreground">{row.period}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={row.status === "DONE" ? "default" : row.status === "FAILED" ? "destructive" : "secondary"}>
                                                {row.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{row.createdAt}</TableCell>
                                        <TableCell>
                                            {row.isScenario ? (
                                                <div>
                                                    <Badge variant="secondary">Scenario</Badge>
                                                    <div className="mt-1 text-xs text-muted-foreground">Parent {row.parentRunId ?? "-"}</div>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">Base run</span>
                                            )}
                                        </TableCell>
                                        <TableCell>{row.model.toUpperCase()}</TableCell>
                                        <TableCell>{row.mode.toUpperCase()}</TableCell>
                                        <TableCell>{row.frequency}</TableCell>
                                        <TableCell className="text-right">{formatPercent(row.accuracy)}</TableCell>
                                        <TableCell className="text-right">{formatPercent(row.smape)}</TableCell>
                                        <TableCell className="text-right">{formatNumber(row.mae, 1)}</TableCell>
                                        <TableCell className="text-right">{formatNumber(row.rmse, 1)}</TableCell>
                                        <TableCell className="text-right">{row.totalSeries ?? "-"}</TableCell>
                                        <TableCell className="text-right">{row.highErrorSeries}</TableCell>
                                        <TableCell className="text-right">{row.assumptionsAffected}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/forecasts/forecasting-summary?runId=${encodeURIComponent(row.runId)}`}>Summary</Link>
                                                </Button>
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/forecasts/forecast-navigator?runId=${encodeURIComponent(row.runId)}`}>Navigator</Link>
                                                </Button>
                                            </div>
                                        </TableCell>
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
