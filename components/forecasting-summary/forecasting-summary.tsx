"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, Pencil, RefreshCw, TableProperties, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ForecastRunSelector } from "@/components/forecasts/forecast-run-selector"
import { fetchForecastResult } from "@/lib/forecasting"
import { fetchForecastRuns, formatRunTimestamp, type ForecastRunOption } from "@/lib/forecast-runs"
import { buildRunScopedUrl } from "@/lib/forecast-runs"
import { getForecastApproval, listForecastApprovals, subscribeForecastApprovalChanges, type ApprovalMap } from "@/lib/forecast-approvals"
import { getForecastMetadataDisplaySku, getForecastMetadataDisplayStore } from "@/lib/forecast-metadata"
import { useForecastCopilot } from "@/components/copilot/forecast-copilot-provider"

type ForecastMetadata = {
  sku?: string
  store?: string
  skuDesc?: string
  forecastMethod?: string
  ABCclass?: string
  ABCpercentage?: number
}

type DailyForecast = {
  sku: string
  store?: string
  date: string
  forecast: number
}

type ReplenishmentSignal = {
  sku?: string
  store?: string
  risk?: string
  reason?: string
}

type ReportSummary = {
  totalSkus?: number
  totalSeries?: number
  rows?: number
  dateStart?: string
  dateEnd?: string
  runConfig?: {
    executedModel?: string
    executedMode?: string
    detectedFrequency?: string
  }
  futureAssumptionsDiagnostics?: {
    actionableOverridesProvided?: boolean
    dailyForecastImpact?: {
      affectedItemCount?: number
    }
  }
}

type SummaryRow = {
  seriesKey: string
  sku: string
  store: string
  description: string
  forecastMethod: string
  abcClass: string
  approved: boolean
  horizonForecast: number
  risk: string
  riskReason: string
}

export const ForecastingSummary = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { setCopilotContext } = useForecastCopilot()

  const initialRunId = searchParams.get("runId") ?? ""
  const [runs, setRuns] = useState<ForecastRunOption[]>([])
  const [selectedRunId, setSelectedRunId] = useState(initialRunId)
  const [rows, setRows] = useState<SummaryRow[]>([])
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null)
  const [approvalMap, setApprovalMap] = useState<ApprovalMap>({})
  const [searchText, setSearchText] = useState("")
  const [selectedStore, setSelectedStore] = useState("all")
  const [selectedException, setSelectedException] = useState<"all" | "risk" | "adjusted" | "a-class">("all")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadApprovals = async () => {
      const map = await listForecastApprovals()
      setApprovalMap(map)
    }
    loadApprovals()
    return subscribeForecastApprovalChanges(async () => {
      const map = await listForecastApprovals()
      setApprovalMap(map)
    })
  }, [])

  useEffect(() => {
    const loadRuns = async () => {
      const nextRuns = await fetchForecastRuns(25)
      setRuns(nextRuns)
      if (!selectedRunId && nextRuns[0]?.runId) {
        setSelectedRunId(nextRuns[0].runId)
      }
    }
    void loadRuns()
  }, [selectedRunId])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (selectedRunId) params.set("runId", selectedRunId)
    else params.delete("runId")
    const nextQuery = params.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
    }
  }, [pathname, router, searchParams, selectedRunId])

  useEffect(() => {
    if (!selectedRunId) return

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [metadata, dailyForecasts, summary, replenishment] = await Promise.all([
          fetchForecastResult<Record<string, ForecastMetadata>>(buildRunScopedUrl("/api/get-skus-metadata", selectedRunId)),
          fetchForecastResult<DailyForecast[]>(buildRunScopedUrl("/api/get-daily-forecasts", selectedRunId)),
          fetchForecastResult<ReportSummary>(buildRunScopedUrl("/api/get-report-summary", selectedRunId)),
          fetchForecastResult<{ items?: ReplenishmentSignal[] }>(
            buildRunScopedUrl("/api/get-replenishment-signals?horizon=30", selectedRunId)
          ),
        ])

        const forecastBySeries = new Map<string, number>()
        for (const row of dailyForecasts ?? []) {
          const key = `${row.sku}::${row.store || "Unknown"}`
          forecastBySeries.set(key, (forecastBySeries.get(key) ?? 0) + Number(row.forecast ?? 0))
        }

        const riskBySeries = new Map<string, ReplenishmentSignal>()
        for (const row of replenishment?.items ?? []) {
          riskBySeries.set(`${row.sku}::${row.store || "Unknown"}`, row)
        }

        const nextRows: SummaryRow[] = Object.entries(metadata ?? {}).map(([seriesKey, value]) => ({
          seriesKey,
          sku: getForecastMetadataDisplaySku(seriesKey, value),
          store: getForecastMetadataDisplayStore(seriesKey, value),
          description: value.skuDesc ?? "",
          forecastMethod: value.forecastMethod ?? "-",
          abcClass: value.ABCclass ?? "C",
          approved: getForecastApproval(approvalMap, getForecastMetadataDisplaySku(seriesKey, value), value.store),
          horizonForecast: Math.round(forecastBySeries.get(seriesKey) ?? 0),
          risk: String(riskBySeries.get(seriesKey)?.risk || "Healthy"),
          riskReason: riskBySeries.get(seriesKey)?.reason || "No active replenishment exception.",
        }))

        nextRows.sort((a, b) => b.horizonForecast - a.horizonForecast || a.seriesKey.localeCompare(b.seriesKey))
        setRows(nextRows)
        setReportSummary(summary)
      } catch (e) {
        setRows([])
        setReportSummary(null)
        setError(e instanceof Error ? e.message : "Failed to load forecasting summary")
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [approvalMap, selectedRunId])

  const selectedRun = useMemo(() => runs.find((run) => run.runId === selectedRunId) ?? null, [runs, selectedRunId])
  const stores = useMemo(() => Array.from(new Set(rows.map((row) => row.store))).sort(), [rows])

  const filteredRows = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    return rows.filter((row) => {
      const matchesStore = selectedStore === "all" || row.store === selectedStore
      const matchesException =
        selectedException === "all" ||
        (selectedException === "risk" && row.risk !== "Healthy") ||
        (selectedException === "adjusted" && Boolean(reportSummary?.futureAssumptionsDiagnostics?.actionableOverridesProvided)) ||
        (selectedException === "a-class" && row.abcClass === "A")
      const matchesSearch =
        !query ||
        row.sku.toLowerCase().includes(query) ||
        row.store.toLowerCase().includes(query) ||
        row.description.toLowerCase().includes(query) ||
        row.forecastMethod.toLowerCase().includes(query)
      return matchesStore && matchesException && matchesSearch
    })
  }, [reportSummary?.futureAssumptionsDiagnostics?.actionableOverridesProvided, rows, searchText, selectedException, selectedStore])

  useEffect(() => {
    const primaryRow = filteredRows[0] ?? rows[0] ?? null
    setCopilotContext({
      runId: selectedRunId || null,
      pageId: "forecasting-summary",
      route: pathname || "/forecasts/forecasting-summary",
      contextMode: "analysis",
      selectedSku: primaryRow?.sku || null,
      selectedStore: primaryRow?.store || (selectedStore !== "all" ? selectedStore : null),
    })

    return () => setCopilotContext(null)
  }, [filteredRows, pathname, rows, selectedRunId, selectedStore, setCopilotContext])

  const stats = useMemo(() => {
    const approved = rows.filter((row) => row.approved).length
    const aClass = rows.filter((row) => row.abcClass === "A").length
    const risky = rows.filter((row) => row.risk !== "Healthy").length
    const totalForecast = rows.reduce((sum, row) => sum + row.horizonForecast, 0)
    return {
      totalSeries: rows.length,
      approved,
      aClass,
      risky,
      totalForecast,
      stores: stores.length,
    }
  }, [rows, stores.length])

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[2000px] mx-auto p-5 min-w-0 space-y-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Forecasting Summary</h1>
            <p className="text-muted-foreground mt-1">Run-aware forecast review by SKU-location with direct drill-in to navigator and editor.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ForecastRunSelector runs={runs} value={selectedRunId} onValueChange={setSelectedRunId} />
            <Button variant="outline" size="icon" onClick={() => router.refresh()} aria-label="Refresh summary">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card className="border-slate-200 bg-slate-50/70">
          <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-6">
            <div>
              <div className="text-xs text-muted-foreground">Run</div>
              <div className="font-medium">{selectedRun?.runId ?? "--"}{selectedRun?.isScenario ? " · Scenario" : ""}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Created</div>
              <div className="font-medium">{formatRunTimestamp(selectedRun?.createdAt)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Model</div>
              <div className="font-medium">{(reportSummary?.runConfig?.executedModel || "-").toUpperCase()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Mode</div>
              <div className="font-medium">{(reportSummary?.runConfig?.executedMode || "-").toUpperCase()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Frequency</div>
              <div className="font-medium">{reportSummary?.runConfig?.detectedFrequency || "-"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">History window</div>
              <div className="font-medium">{reportSummary?.dateStart && reportSummary?.dateEnd ? `${reportSummary.dateStart} to ${reportSummary.dateEnd}` : "-"}</div>
            </div>
          </CardContent>
        </Card>
        {selectedRun?.isScenario ? (
          <Card className="border-blue-200 bg-blue-50/70">
            <CardContent className="flex flex-wrap gap-4 p-4 text-sm text-blue-900">
              <div><span className="text-blue-700">Scenario label:</span> {selectedRun.scenarioLabel || "Manual override scenario"}</div>
              <div><span className="text-blue-700">Parent run:</span> {selectedRun.parentRunId || "--"}</div>
              <div><span className="text-blue-700">Edited at:</span> {formatRunTimestamp(selectedRun.editedAt || selectedRun.createdAt)}</div>
              <div><span className="text-blue-700">Edited cells:</span> {selectedRun.editedCellCount ?? 0}</div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card><CardHeader className="pb-2"><CardDescription>Total Series</CardDescription><CardTitle>{stats.totalSeries}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{stats.stores} stores covered</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Approved Series</CardDescription><CardTitle>{stats.approved}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Current approval state across SKU-location rows</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>30-Day Forecast</CardDescription><CardTitle>{stats.totalForecast.toLocaleString()}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Summed from daily forecast output</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Replenishment Exceptions</CardDescription><CardTitle>{stats.risky}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">High, medium, or critical stock risk</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>A-Class Series</CardDescription><CardTitle>{stats.aClass}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">High-value items for planner focus</CardContent></Card>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant={selectedException === "all" ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedException("all")}>All series</Badge>
          <Badge variant={selectedException === "risk" ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedException("risk")}>Risk exceptions</Badge>
          <Badge variant={selectedException === "adjusted" ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedException("adjusted")}>Adjusted run context</Badge>
          <Badge variant={selectedException === "a-class" ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedException("a-class")}>A-class focus</Badge>
          {reportSummary?.futureAssumptionsDiagnostics?.dailyForecastImpact?.affectedItemCount ? (
            <Badge variant="secondary">
              {reportSummary.futureAssumptionsDiagnostics.dailyForecastImpact.affectedItemCount} points affected by assumptions
            </Badge>
          ) : null}
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TableProperties className="h-4 w-4" />
                Forecast Command Center
              </CardTitle>
              <CardDescription>Review product-location forecast outputs, risk, and workflow actions for the selected run.</CardDescription>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Search SKU, store, description, or model"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder="Store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store} value={store}>{store}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground flex items-center">{filteredRows.length} visible rows</div>
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
            ) : isLoading ? (
              <div className="py-8 text-sm text-muted-foreground">Loading run-aware forecast summary...</div>
            ) : filteredRows.length === 0 ? (
              <div className="py-8 text-sm text-muted-foreground">No SKU-location rows match this run and filter scope.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU-Location</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>ABC</TableHead>
                      <TableHead>Approved</TableHead>
                      <TableHead className="text-right">30d Forecast</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => (
                      <TableRow key={row.seriesKey}>
                        <TableCell className="font-medium">{row.sku} · {row.store}</TableCell>
                        <TableCell>{row.description || "--"}</TableCell>
                        <TableCell><Badge variant="secondary">{row.forecastMethod}</Badge></TableCell>
                        <TableCell><Badge variant={row.abcClass === "A" ? "default" : row.abcClass === "B" ? "secondary" : "outline"}>{row.abcClass}</Badge></TableCell>
                        <TableCell>{row.approved ? "Approved" : "Pending"}</TableCell>
                        <TableCell className="text-right">{row.horizonForecast.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={row.risk === "Healthy" ? "outline" : "destructive"}>{row.risk}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[280px] text-xs text-muted-foreground">{row.riskReason}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/forecasts/forecast-navigator?sku=${encodeURIComponent(row.sku)}&store=${encodeURIComponent(row.store)}&runId=${encodeURIComponent(selectedRunId)}`}>
                                <TrendingUp className="mr-2 h-4 w-4" />
                                View
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/forecasts/forecast-editor?sku=${encodeURIComponent(row.sku)}&store=${encodeURIComponent(row.store)}&runId=${encodeURIComponent(selectedRunId)}`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="flex gap-3 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Forecast review is now run-aware. Use the run selector before comparing values or editing a SKU-location so you stay aligned to the correct scenario lineage.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
