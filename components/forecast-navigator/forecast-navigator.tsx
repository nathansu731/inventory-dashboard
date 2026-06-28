"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Download, GitCompare, Pencil, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ForecastTable } from "@/components/forecast-navigator/forecast-table"
import { ForecastChart } from "@/components/forecast-navigator/forecast-chart"
import { ForecastRunSelector } from "@/components/forecasts/forecast-run-selector"
import { fetchForecastResult } from "@/lib/forecasting"
import { buildRunScopedUrl, fetchForecastRuns, formatRunTimestamp, type ForecastRunOption } from "@/lib/forecast-runs"
import { useProjectionDiagnostics } from "@/hooks/use-projection-diagnostics"
import {
  type AggregationLabel,
  aggregateValueMap,
  buildAggregationBuckets,
  formatPeriodByFrequency,
  frequencyToLabel,
  getAvailableAggregationLabels,
  labelToFrequency,
  normalizeFrequency,
} from "@/lib/forecast-aggregation"
import {
  getForecastApproval,
  listForecastApprovals,
  updateForecastApproval,
  subscribeForecastApprovalChanges,
  type ApprovalMap,
} from "@/lib/forecast-approvals"
import { buildForecastSeriesKey } from "@/lib/forecast-metadata"
import { useForecastCopilot } from "@/components/copilot/forecast-copilot-provider"

type ForecastItem = {
  sku: string
  store?: string
  frequency?: string
  periods: string[]
  demand?: Record<string, number | null>
  forecastBaseline?: Record<string, number | null>
  demandAdjustment?: Record<string, number | null>
  forecastAdjustment?: Record<string, number | null>
  variance?: Record<string, number | null>
  revenue?: Record<string, number | null>
  lower80?: Record<string, number | null>
  upper80?: Record<string, number | null>
}

type ForecastValuesPayload = {
  frequency?: string
  items?: ForecastItem[]
}

type RowData = {
  label: string
  values: Array<number | null>
}

const LABEL_MAP: Array<{ key: keyof ForecastItem; label: string }> = [
  { key: "demand", label: "Demand" },
  { key: "forecastBaseline", label: "Forecast Baseline" },
  { key: "demandAdjustment", label: "Demand Adjustment" },
  { key: "forecastAdjustment", label: "Forecast Adjustment" },
  { key: "variance", label: "Variance" },
  { key: "revenue", label: "Revenue" },
]

const buildAdjustedMap = (item?: ForecastItem | null) => {
  const result: Record<string, number | null> = {}
  if (!item) return result
  const periods = item.periods ?? []
  periods.forEach((period) => {
    const baseline = Number(item.forecastBaseline?.[period] ?? 0)
    const adjustment = Number(item.forecastAdjustment?.[period] ?? 0)
    const total = baseline + adjustment
    result[period] = Number.isFinite(total) ? total : null
  })
  return result
}

export const ForecastNavigator = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const projectionDiagnostics = useProjectionDiagnostics()
  const { setCopilotContext } = useForecastCopilot()

  const requestedSku = searchParams.get("sku")?.trim() ?? ""
  const requestedStore = searchParams.get("store")?.trim() ?? ""
  const requestedRunId = searchParams.get("runId")?.trim() ?? ""
  const requestedCompareRunId = searchParams.get("compareRunId")?.trim() ?? ""

  const [runs, setRuns] = useState<ForecastRunOption[]>([])
  const [selectedRunId, setSelectedRunId] = useState(requestedRunId)
  const [compareRunId, setCompareRunId] = useState(requestedCompareRunId)
  const [primaryPayload, setPrimaryPayload] = useState<ForecastValuesPayload>({ items: [] })
  const [comparePayload, setComparePayload] = useState<ForecastValuesPayload>({ items: [] })
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string>("")
  const [aggregationType, setAggregationType] = useState<AggregationLabel>("Monthly")
  const [error, setError] = useState<string | null>(null)
  const [isApproved, setIsApproved] = useState(false)
  const [approvalMap, setApprovalMap] = useState<ApprovalMap>({})

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
    if (compareRunId) params.set("compareRunId", compareRunId)
    else params.delete("compareRunId")
    const nextQuery = params.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
    }
  }, [compareRunId, pathname, router, searchParams, selectedRunId])

  useEffect(() => {
    if (!selectedRunId) return
    const load = async () => {
      setError(null)
      try {
        const [primary, compare] = await Promise.all([
          fetchForecastResult<ForecastValuesPayload>(buildRunScopedUrl("/api/get-sku-forecast-values", selectedRunId)),
          compareRunId
            ? fetchForecastResult<ForecastValuesPayload>(buildRunScopedUrl("/api/get-sku-forecast-values", compareRunId))
            : Promise.resolve(null),
        ])
        const nextPrimary = { ...(primary ?? {}), items: primary?.items ?? [] }
        const nextCompare = { ...(compare ?? {}), items: compare?.items ?? [] }
        setPrimaryPayload(nextPrimary)
        setComparePayload(nextCompare)

        const items = nextPrimary.items ?? []
        if (items.length === 0) {
          setSelectedSeriesKey("")
        } else if (requestedSku) {
          const requestedMatch =
            items.find((item) => item.sku === requestedSku && (!requestedStore || item.store === requestedStore)) ??
            items.find((item) => item.sku === requestedSku)
          setSelectedSeriesKey(buildForecastSeriesKey(requestedMatch?.sku ?? items[0].sku, requestedMatch?.store ?? items[0].store))
        } else if (!items.some((item) => buildForecastSeriesKey(item.sku, item.store) === selectedSeriesKey)) {
          setSelectedSeriesKey(buildForecastSeriesKey(items[0].sku, items[0].store))
        }
      } catch (e) {
        setPrimaryPayload({ items: [] })
        setComparePayload({ items: [] })
        setSelectedSeriesKey("")
        setError(e instanceof Error ? e.message : "Failed to load forecast navigator")
      }
    }
    void load()
  }, [compareRunId, requestedSku, requestedStore, selectedRunId, selectedSeriesKey])

  const items = useMemo(() => primaryPayload.items ?? [], [primaryPayload.items])
  const selectedItem = useMemo(
    () => items.find((item) => buildForecastSeriesKey(item.sku, item.store) === selectedSeriesKey) ?? items[0],
    [items, selectedSeriesKey]
  )
  const compareItem = useMemo(() => {
    if (!selectedItem) return null
    return (
      comparePayload.items?.find(
        (item) => buildForecastSeriesKey(item.sku, item.store) === buildForecastSeriesKey(selectedItem.sku, selectedItem.store)
      ) ?? null
    )
  }, [comparePayload.items, selectedItem])

  useEffect(() => {
    setCopilotContext({
      runId: selectedRunId || null,
      pageId: "forecast-navigator",
      route: pathname || "/forecasts/forecast-navigator",
      contextMode: "analysis",
      selectedSku: selectedItem?.sku || null,
      selectedStore: selectedItem?.store || null,
    })

    return () => setCopilotContext(null)
  }, [pathname, selectedItem?.sku, selectedItem?.store, selectedRunId, setCopilotContext])

  useEffect(() => {
    if (!selectedItem) {
      setIsApproved(false)
      return
    }
    setIsApproved(getForecastApproval(approvalMap, selectedItem.sku, selectedItem.store))
  }, [approvalMap, selectedItem])

  const skuOptions = useMemo(
    () =>
      items.map((item) => ({
        value: buildForecastSeriesKey(item.sku, item.store),
        label: `${item.sku} · ${item.store || "Unknown"}`,
      })),
    [items]
  )

  const baseFrequency = useMemo(
    () => normalizeFrequency(selectedItem?.frequency || primaryPayload.frequency || "monthly"),
    [primaryPayload.frequency, selectedItem?.frequency]
  )
  const availableAggregations = useMemo(() => getAvailableAggregationLabels(baseFrequency), [baseFrequency])
  const targetFrequency = useMemo(() => labelToFrequency(aggregationType), [aggregationType])

  useEffect(() => {
    setAggregationType(frequencyToLabel(baseFrequency))
  }, [baseFrequency, selectedSeriesKey])

  const sourcePeriods = useMemo(() => selectedItem?.periods ?? [], [selectedItem])
  const buckets = useMemo(
    () => buildAggregationBuckets(sourcePeriods, baseFrequency, targetFrequency),
    [baseFrequency, sourcePeriods, targetFrequency]
  )
  const periods = useMemo(() => buckets.periods, [buckets.periods])

  const rowData: RowData[] = useMemo(() => {
    if (!selectedItem) return []
    const aggregatedMaps = LABEL_MAP.reduce<Record<string, Record<string, number | null>>>((acc, entry) => {
      acc[String(entry.key)] = aggregateValueMap(
        (selectedItem[entry.key] as Record<string, number | null> | undefined) ?? {},
        sourcePeriods,
        buckets
      )
      return acc
    }, {})
    const adjustedMap = aggregateValueMap(buildAdjustedMap(selectedItem), sourcePeriods, buckets)

    return [
      ...LABEL_MAP.map(({ key, label }) => {
        const map = aggregatedMaps[String(key)] ?? {}
        return {
          label,
          values: periods.map((period) => (period in map ? map[period] : null)),
        }
      }),
      {
        label: "Adjusted Forecast",
        values: periods.map((period) => (period in adjustedMap ? adjustedMap[period] : null)),
      },
    ]
  }, [buckets, periods, selectedItem, sourcePeriods])

  const compareAdjustedMap = useMemo(() => {
    if (!compareItem) return {}
    return aggregateValueMap(buildAdjustedMap(compareItem), compareItem.periods ?? [], buckets)
  }, [buckets, compareItem])

  const chartData = useMemo(() => {
    const demandRow = rowData.find((row) => row.label === "Demand")
    const baselineRow = rowData.find((row) => row.label === "Forecast Baseline")
    const adjustedRow = rowData.find((row) => row.label === "Adjusted Forecast")
    return periods.map((period, index) => ({
      month: formatPeriodByFrequency(period, targetFrequency),
      demand: demandRow?.values[index] ?? null,
      forecastBaseline: baselineRow?.values[index] ?? null,
      adjustedForecast: adjustedRow?.values[index] ?? null,
      compareAdjustedForecast: period in compareAdjustedMap ? compareAdjustedMap[period] : null,
    }))
  }, [compareAdjustedMap, periods, rowData, targetFrequency])

  const selectedRun = useMemo(() => runs.find((run) => run.runId === selectedRunId) ?? null, [runs, selectedRunId])
  const compareRun = useMemo(() => runs.find((run) => run.runId === compareRunId) ?? null, [compareRunId, runs])
  const projectionGeneratedAtLabel = useMemo(() => {
    const raw = projectionDiagnostics?.projection?.generatedAt
    if (!raw) return null
    const parsed = new Date(raw)
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleString()
  }, [projectionDiagnostics?.projection?.generatedAt])

  const adjustedTotal = useMemo(
    () =>
      chartData.reduce((sum, point) => sum + Number(point.adjustedForecast ?? 0), 0),
    [chartData]
  )
  const baselineTotal = useMemo(
    () =>
      chartData.reduce((sum, point) => sum + Number(point.forecastBaseline ?? 0), 0),
    [chartData]
  )
  const compareAdjustedTotal = useMemo(
    () =>
      chartData.reduce((sum, point) => sum + Number(point.compareAdjustedForecast ?? 0), 0),
    [chartData]
  )

  const handleExportCsv = () => {
    if (!selectedItem || periods.length === 0) return
    const headers = ["Metric", ...periods]
    const rows = rowData.map((row) => [row.label, ...row.values.map((value) => (value == null ? "--" : String(value)))])
    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `forecast-navigator-${selectedItem.sku}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[2000px] mx-auto p-5 min-w-0 space-y-5">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Forecast Navigator</h1>
          <p className="text-muted-foreground mt-1">Compare actuals, baseline, adjustments, and scenario runs for a selected SKU-location.</p>
          {projectionDiagnostics?.projection?.updatedByRunId && projectionGeneratedAtLabel ? (
            <div className="mt-2">
              <Badge variant="outline">Projection: {projectionDiagnostics.projection.updatedByRunId} · {projectionGeneratedAtLabel}</Badge>
            </div>
          ) : null}
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <ForecastRunSelector runs={runs} value={selectedRunId} onValueChange={setSelectedRunId} />
              <ForecastRunSelector runs={runs.filter((run) => run.runId !== selectedRunId)} value={compareRunId} onValueChange={setCompareRunId} placeholder="Compare run" />
              <Select value={selectedSeriesKey} onValueChange={setSelectedSeriesKey}>
                <SelectTrigger className="w-[260px] max-w-full">
                  <SelectValue placeholder="Select SKU-location" />
                </SelectTrigger>
                <SelectContent>
                  {skuOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={aggregationType} onValueChange={(value) => setAggregationType(value as AggregationLabel)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Aggregation" />
                </SelectTrigger>
                <SelectContent>
                  {availableAggregations.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              {selectedItem ? (
                <Button variant={isApproved ? "default" : "outline"} size="sm" onClick={() => {
                  const next = !isApproved
                  updateForecastApproval(selectedItem.sku, next, selectedItem.store)
                  setIsApproved(next)
                }}>
                  {isApproved ? "Approved" : "Approve"}
                </Button>
              ) : null}
              {selectedItem ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/forecasts/forecast-editor?sku=${encodeURIComponent(selectedItem.sku)}&store=${encodeURIComponent(selectedItem.store || "")}&runId=${encodeURIComponent(selectedRunId)}`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Series
                  </Link>
                </Button>
              ) : null}
              <Button variant="outline" size="icon" onClick={() => router.refresh()} aria-label="Refresh navigator">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleExportCsv} disabled={!selectedItem || periods.length === 0} aria-label="Export table">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card><CardHeader className="pb-2"><CardDescription>Primary Run</CardDescription><CardTitle className="text-lg">{selectedRun?.runId ?? "--"}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{formatRunTimestamp(selectedRun?.createdAt)}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Baseline Horizon</CardDescription><CardTitle>{Math.round(baselineTotal).toLocaleString()}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Current run baseline total in visible buckets</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Adjusted Horizon</CardDescription><CardTitle>{Math.round(adjustedTotal).toLocaleString()}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Baseline plus forecast adjustments</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Compare Run Delta</CardDescription><CardTitle>{compareRun ? `${Math.round(adjustedTotal - compareAdjustedTotal).toLocaleString()}` : "--"}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{compareRun ? `${compareRun.runId} selected for overlay` : "Add a compare run to benchmark scenarios"}</CardContent></Card>
        </div>
        {selectedRun?.isScenario ? (
          <Card className="border-blue-200 bg-blue-50/70">
            <CardContent className="flex flex-wrap gap-4 p-4 text-sm text-blue-900">
              <div><span className="text-blue-700">Scenario:</span> {selectedRun.scenarioLabel || "Manual override scenario"}</div>
              <div><span className="text-blue-700">Parent run:</span> {selectedRun.parentRunId || "--"}</div>
              <div><span className="text-blue-700">Edited cells:</span> {selectedRun.editedCellCount ?? 0}</div>
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            Failed to load forecast navigator. {error}
          </div>
        ) : !selectedItem ? (
          <div className="rounded-md border bg-muted/30 p-8 text-center">
            <p className="text-base font-medium">No forecast values available</p>
            <p className="text-sm text-muted-foreground mt-1">Select a run with generated series output to populate this page.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
              <ForecastTable months={periods.map((period) => formatPeriodByFrequency(period, targetFrequency))} rowData={rowData} />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GitCompare className="h-4 w-4" />
                    Series Context
                  </CardTitle>
                  <CardDescription>Explain the selected SKU-location before editing or approving.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div><span className="text-muted-foreground">SKU-location:</span> {selectedItem.sku} · {selectedItem.store || "Unknown"}</div>
                  <div><span className="text-muted-foreground">Frequency:</span> {selectedItem.frequency || primaryPayload.frequency || "-"}</div>
                  <div><span className="text-muted-foreground">Primary run:</span> {selectedRun?.runId ?? "--"}</div>
                  <div><span className="text-muted-foreground">Compare run:</span> {compareRun?.runId ?? "None"}</div>
                  <div><span className="text-muted-foreground">Approval:</span> {isApproved ? "Approved" : "Pending"}</div>
                  <div><span className="text-muted-foreground">Visible periods:</span> {periods.length}</div>
                </CardContent>
              </Card>
            </div>
            <ForecastChart data={chartData} />
          </>
        )}
      </div>
    </div>
  )
}
