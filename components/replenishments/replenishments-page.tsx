"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  CalendarClock,
  CircleAlert,
  ClipboardList,
  PackageCheck,
  Search,
  TriangleAlert,
} from "lucide-react"
import { fetchForecastResult } from "@/lib/forecasting"
import {
  buildReplenishmentRows,
  type ReplenishmentRiskTier,
  type ReplenishmentRow,
  summarizeReplenishment,
} from "@/lib/replenishments"
import {
  matchesReplenishmentPreset,
  REPLENISHMENT_EXCEPTION_PRESETS,
  type ReplenishmentExceptionPreset,
} from "@/lib/replenishment-exceptions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useForecastCopilot } from "@/components/copilot/forecast-copilot-provider"

type SkuMetadata = {
  store?: string
  skuDesc?: string
  ABCclass?: string
  ABCpercentage?: number
}

type DailyForecast = {
  sku: string
  store?: string
  date: string
  forecast: number
}

type ReplenishmentSignalItem = {
  seriesKey?: string
  sku: string
  store?: string
  skuDesc?: string
  abcClass?: string
  avgDailyDemand?: number
  horizonDemand?: number
  onHand?: number
  onHandSource?: "provided" | "estimated" | "unknown"
  daysOfCover?: number
  predictedStockoutDate?: string | null
  reorderByDate?: string | null
  recommendedReorderQty?: number
  leadTimeDays?: number
  safetyStockDays?: number
  risk?: ReplenishmentRiskTier
  reason?: string
}

type ReplenishmentSignalResult = {
  generatedAt?: string | null
  horizonDays?: number
  inventoryCoverage?: {
    totalSeries?: number
    providedCount?: number
    estimatedCount?: number
    snapshotUploadedAt?: string | null
    snapshotAsOfDate?: string | null
    sourceType?: string | null
  }
  items?: ReplenishmentSignalItem[]
}

const formatNumber = (value: number) => value.toLocaleString()

const formatDate = (value: string | null) => {
  if (!value) return "N/A"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
}

const riskClassName = (risk: ReplenishmentRiskTier) => {
  if (risk === "Critical") return "bg-red-100 text-red-800 border-red-200"
  if (risk === "High") return "bg-orange-100 text-orange-800 border-orange-200"
  if (risk === "Medium") return "bg-yellow-100 text-yellow-800 border-yellow-200"
  return "bg-green-100 text-green-800 border-green-200"
}

export const ReplenishmentsPage = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { setCopilotContext } = useForecastCopilot()

  const initialQuery = searchParams.get("q") ?? ""
  const initialStore = searchParams.get("store") ?? "all"
  const riskParam = searchParams.get("risk")
  const initialRisk: "all" | ReplenishmentRiskTier =
    riskParam === "Critical" || riskParam === "High" || riskParam === "Medium" || riskParam === "Healthy"
      ? riskParam
      : "all"
  const horizonParam = searchParams.get("horizon")
  const initialHorizon: "14" | "30" | "60" =
    horizonParam === "14" || horizonParam === "60" ? horizonParam : "30"

  const [rows, setRows] = useState<ReplenishmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState(initialQuery)
  const [selectedStore, setSelectedStore] = useState(initialStore)
  const [selectedRisk, setSelectedRisk] = useState<"all" | ReplenishmentRiskTier>(initialRisk)
  const [horizonDays, setHorizonDays] = useState<"14" | "30" | "60">(initialHorizon)
  const [selectedPreset, setSelectedPreset] = useState<ReplenishmentExceptionPreset>("all")
  const [selectedRow, setSelectedRow] = useState<ReplenishmentRow | null>(null)
  const [inventoryCoverage, setInventoryCoverage] = useState<ReplenishmentSignalResult["inventoryCoverage"] | null>(null)

  useEffect(() => {
    const nextQuery = searchParams.get("q") ?? ""
    const nextStore = searchParams.get("store") ?? "all"
    const nextRiskParam = searchParams.get("risk")
    const nextRisk: "all" | ReplenishmentRiskTier =
      nextRiskParam === "Critical" || nextRiskParam === "High" || nextRiskParam === "Medium" || nextRiskParam === "Healthy"
        ? nextRiskParam
        : "all"
    const nextHorizonParam = searchParams.get("horizon")
    const nextHorizon: "14" | "30" | "60" =
      nextHorizonParam === "14" || nextHorizonParam === "60" ? nextHorizonParam : "30"

    if (nextQuery !== searchTerm) setSearchTerm(nextQuery)
    if (nextStore !== selectedStore) setSelectedStore(nextStore)
    if (nextRisk !== selectedRisk) setSelectedRisk(nextRisk)
    if (nextHorizon !== horizonDays) setHorizonDays(nextHorizon)
  }, [searchParams, searchTerm, selectedStore, selectedRisk, horizonDays])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())

    if (searchTerm.trim()) params.set("q", searchTerm.trim())
    else params.delete("q")

    if (selectedStore !== "all") params.set("store", selectedStore)
    else params.delete("store")

    if (selectedRisk !== "all") params.set("risk", selectedRisk)
    else params.delete("risk")

    if (horizonDays !== "30") params.set("horizon", horizonDays)
    else params.delete("horizon")

    const nextQueryString = params.toString()
    const currentQueryString = searchParams.toString()
    if (nextQueryString !== currentQueryString) {
      router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, { scroll: false })
    }
  }, [searchTerm, selectedStore, selectedRisk, horizonDays, searchParams, router, pathname])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const [signals, metadata, dailyForecasts] = await Promise.all([
          fetchForecastResult<ReplenishmentSignalResult>(`/api/get-replenishment-signals?horizon=${horizonDays}`),
          fetchForecastResult<Record<string, SkuMetadata>>("/api/get-skus-metadata"),
          fetchForecastResult<DailyForecast[]>("/api/get-daily-forecasts"),
        ])

        const signalItems = Array.isArray(signals?.items) ? signals.items : []
        if (signalItems.length > 0) {
          const mappedRows: ReplenishmentRow[] = signalItems.map((item) => ({
            seriesKey: item.seriesKey || `${item.sku}::${item.store || "Unknown"}`,
            sku: item.sku,
            skuDesc: item.skuDesc || "N/A",
            store: item.store || "Unknown",
            abcClass: item.abcClass || "C",
            avgDailyDemand: Number(item.avgDailyDemand ?? 0),
            horizonDemand: Number(item.horizonDemand ?? 0),
            estimatedOnHand: Number(item.onHand ?? 0),
            onHandSource: item.onHandSource || "unknown",
            daysOfCover: Number(item.daysOfCover ?? 0),
            predictedStockoutDate: item.predictedStockoutDate ?? null,
            reorderByDate: item.reorderByDate ?? null,
            recommendedReorderQty: Number(item.recommendedReorderQty ?? 0),
            leadTimeDays: Number(item.leadTimeDays ?? 0),
            safetyStockDays: Number(item.safetyStockDays ?? 0),
            risk: item.risk || "Healthy",
            reason: item.reason || "No risk explanation available.",
          }))
          const sortedRows = [...mappedRows].sort((a, b) => {
            const rank = (risk: ReplenishmentRiskTier) =>
              risk === "Critical" ? 4 : risk === "High" ? 3 : risk === "Medium" ? 2 : 1
            const byRisk = rank(b.risk) - rank(a.risk)
            if (byRisk !== 0) return byRisk
            if (!a.predictedStockoutDate && !b.predictedStockoutDate) return a.seriesKey.localeCompare(b.seriesKey)
            if (!a.predictedStockoutDate) return 1
            if (!b.predictedStockoutDate) return -1
            return a.predictedStockoutDate.localeCompare(b.predictedStockoutDate)
          })
          setRows(sortedRows)
          setInventoryCoverage(signals?.inventoryCoverage || null)
          setLoading(false)
          return
        }

        if (!metadata || !dailyForecasts) {
          setRows([])
          setError("Could not load replenishment data.")
          setLoading(false)
          return
        }

        const computedRows = buildReplenishmentRows(metadata, dailyForecasts, Number(horizonDays))
        setRows(computedRows)
        setInventoryCoverage(null)
      } catch {
        setRows([])
        setError("Could not load replenishment data.")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [horizonDays])

  const stores = useMemo(() => {
    const values = new Set<string>()
    rows.forEach((row) => values.add(row.store))
    return Array.from(values).sort()
  }, [rows])

  useEffect(() => {
    if (selectedStore !== "all" && stores.length > 0 && !stores.includes(selectedStore)) {
      setSelectedStore("all")
    }
  }, [stores, selectedStore])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        !searchTerm ||
        row.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.skuDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.store.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStore = selectedStore === "all" || row.store === selectedStore
      const matchesRisk = selectedRisk === "all" || row.risk === selectedRisk
      const matchesPreset = matchesReplenishmentPreset(row, selectedPreset)
      return matchesSearch && matchesStore && matchesRisk && matchesPreset
    })
  }, [rows, searchTerm, selectedStore, selectedRisk, selectedPreset])

  useEffect(() => {
    setCopilotContext({
      pageId: "replenishments",
      route: pathname || "/replenishments",
      contextMode: "analysis",
      selectedSku: selectedRow?.sku || null,
      selectedStore: selectedRow?.store || (selectedStore !== "all" ? selectedStore : null),
    })

    return () => setCopilotContext(null)
  }, [pathname, selectedRow?.sku, selectedRow?.store, selectedStore, setCopilotContext])

  const summary = useMemo(() => summarizeReplenishment(filteredRows), [filteredRows])
  const providedInventoryCount = inventoryCoverage?.providedCount ?? rows.filter((row) => row.onHandSource === "provided").length
  const estimatedInventoryCount = inventoryCoverage?.estimatedCount ?? Math.max(0, rows.length - providedInventoryCount)

  const demandAtRisk = useMemo(
    () => filteredRows.filter((row) => row.risk !== "Healthy").reduce((sum, row) => sum + row.horizonDemand, 0),
    [filteredRows]
  )

  const aClassAtRisk = useMemo(
    () => filteredRows.filter((row) => row.abcClass === "A" && row.risk !== "Healthy").length,
    [filteredRows]
  )

  const avgDaysCover = useMemo(
    () =>
      filteredRows.length > 0
        ? filteredRows.reduce((sum, row) => sum + row.daysOfCover, 0) / filteredRows.length
        : 0,
    [filteredRows]
  )

  const topSuggestions = useMemo(() => {
    return filteredRows
      .filter((row) => row.risk !== "Healthy" && row.recommendedReorderQty > 0)
      .slice(0, 5)
  }, [filteredRows])

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[2000px] mx-auto p-5 min-w-0 space-y-5">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Replenishments</h1>
          <p className="text-muted-foreground mt-1">
            Advisory-only stock outage visibility based on forecast demand. Automated purchasing is not enabled.
          </p>
        </div>

        <Card className="border-blue-100 bg-blue-50/70 py-0">
          <CardContent className="flex flex-col gap-2 p-4 text-sm text-blue-900 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-2">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {providedInventoryCount > 0 && estimatedInventoryCount === 0
                  ? "Inventory snapshot is connected for all forecasted SKU-location pairs. Replenishment signals are based on provided stock-on-hand and forecast demand."
                  : providedInventoryCount > 0
                    ? `Inventory snapshot covers ${providedInventoryCount} SKU-location pairs. ${estimatedInventoryCount} pair(s) still use forecast-derived stock estimates.`
                    : "No inventory snapshot is connected for this tenant yet. Replenishment uses forecast-derived stock estimates until stock-on-hand is uploaded."}
              </p>
            </div>
            <Button asChild size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
              <Link href="/data-input">Upload Data</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>At-Risk SKUs</CardDescription>
              <CardTitle className="text-2xl">{summary.atRisk}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Critical + High + Medium risk rows</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Critical Risk</CardDescription>
              <CardTitle className="text-2xl text-red-700">{summary.critical}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Immediate replenishment attention</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Stockouts in 7 Days</CardDescription>
              <CardTitle className="text-2xl">{summary.stockoutIn7Days}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Based on projected days of cover</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Demand Exposure At Risk</CardDescription>
              <CardTitle className="text-2xl">{formatNumber(demandAtRisk)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Forecast units tied to non-healthy rows</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>A-Class At Risk</CardDescription>
              <CardTitle className="text-2xl">{aClassAtRisk}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">High-value items requiring attention</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Average Days Of Cover</CardDescription>
              <CardTitle className="text-2xl">{avgDaysCover.toFixed(1)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Current filter scope</CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {REPLENISHMENT_EXCEPTION_PRESETS.map((preset) => (
            <Badge
              key={preset.value}
              variant={selectedPreset === preset.value ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedPreset(preset.value)}
            >
              {preset.label}
            </Badge>
          ))}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="space-y-4">
              <div>
                <CardTitle className="text-lg">SKU Worklist</CardTitle>
                <CardDescription>Prioritized by risk severity, reorder urgency, and projected stockout timing.</CardDescription>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="md:col-span-2">
                  <Label htmlFor="replenishment-search" className="sr-only">
                    Search SKU
                  </Label>
                  <div className="relative">
                    <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                      id="replenishment-search"
                      placeholder="Search SKU or description"
                      className="pl-9"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </div>
                </div>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger>
                    <SelectValue placeholder="Store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store} value={store}>
                        {store}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedRisk}
                  onValueChange={(value: "all" | ReplenishmentRiskTier) => setSelectedRisk(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Risk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risk</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Healthy">Healthy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-60">
                <Label className="mb-2 block text-xs text-muted-foreground">Forecast Horizon</Label>
                <Select value={horizonDays} onValueChange={(value: "14" | "30" | "60") => setHorizonDays(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 text-sm text-muted-foreground">Loading replenishment signals...</div>
              ) : error ? (
                <div className="py-8 text-sm text-red-700">{error}</div>
              ) : filteredRows.length === 0 ? (
                <div className="py-8 text-sm text-muted-foreground">
                  No SKUs found for current filters. Upload data or change filter values.
                </div>
              ) : (
                <div className="w-full max-w-full overflow-x-auto">
                  <Table className="min-w-[1360px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU-Location</TableHead>
                        <TableHead>ABC</TableHead>
                        <TableHead className="text-right">Avg Daily</TableHead>
                        <TableHead className="text-right">Horizon Demand</TableHead>
                        <TableHead className="text-right">On Hand</TableHead>
                        <TableHead className="text-right">Days Cover</TableHead>
                        <TableHead>Stockout</TableHead>
                        <TableHead className="text-right">Reorder Qty</TableHead>
                        <TableHead>Reorder By</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead className="min-w-[320px]">Reason</TableHead>
                        <TableHead className="w-[96px] text-right">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.map((row) => (
                        <TableRow key={row.seriesKey}>
                          <TableCell className="font-medium align-top">{row.sku} · {row.store}</TableCell>
                          <TableCell className="align-top">{row.abcClass}</TableCell>
                          <TableCell className="text-right align-top">{formatNumber(Math.round(row.avgDailyDemand))}</TableCell>
                          <TableCell className="text-right align-top">{formatNumber(row.horizonDemand)}</TableCell>
                          <TableCell className="text-right align-top">
                            {formatNumber(row.estimatedOnHand)}
                            {row.onHandSource === "estimated" && (
                              <span className="ml-1 text-[10px] text-muted-foreground">(est.)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right align-top">{row.daysOfCover.toFixed(1)}</TableCell>
                          <TableCell className="align-top">{formatDate(row.predictedStockoutDate)}</TableCell>
                          <TableCell className="text-right align-top">{formatNumber(row.recommendedReorderQty)}</TableCell>
                          <TableCell className="align-top">{formatDate(row.reorderByDate)}</TableCell>
                          <TableCell className="align-top">
                            <Badge variant="outline" className={riskClassName(row.risk)}>
                              {row.risk}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-normal break-words text-xs text-muted-foreground align-top">
                            {row.reason}
                          </TableCell>
                          <TableCell className="text-right align-top">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedRow(row)}>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-4 w-4" />
                Priority Exceptions
              </CardTitle>
              <CardDescription>Focus only on the items that need planner review now.</CardDescription>
            </CardHeader>
            <CardContent>
              {topSuggestions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No urgent replenishment exceptions in this view.</div>
              ) : (
                <div className="space-y-3">
                  {topSuggestions.map((row) => (
                    <div key={`${row.seriesKey}-suggestion`} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">{row.sku} · {row.store}</div>
                        <Badge variant="outline" className={riskClassName(row.risk)}>
                          {row.risk}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Order {formatNumber(row.recommendedReorderQty)} units by {formatDate(row.reorderByDate)}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">{row.reason}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={Boolean(selectedRow)} onOpenChange={(open) => !open && setSelectedRow(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedRow && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <PackageCheck className="h-4 w-4" />
                  {selectedRow.sku} Replenishment Signal
                </DialogTitle>
                <DialogDescription>{selectedRow.skuDesc}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 text-sm">
                <div className="rounded-md border p-3">
                  <div className="mb-1 text-xs text-muted-foreground">Risk tier</div>
                  <Badge variant="outline" className={riskClassName(selectedRow.risk)}>
                    {selectedRow.risk}
                  </Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border p-3">
                    <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Predicted stockout
                    </div>
                    <div className="font-medium">{formatDate(selectedRow.predictedStockoutDate)}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Reorder by
                    </div>
                    <div className="font-medium">{formatDate(selectedRow.reorderByDate)}</div>
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="mb-1 text-xs text-muted-foreground">Recommended reorder quantity</div>
                  <div className="text-base font-semibold">{formatNumber(selectedRow.recommendedReorderQty)} units</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Based on {selectedRow.leadTimeDays}d lead time + {selectedRow.safetyStockDays}d safety stock.
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <div className="mb-1 text-xs text-muted-foreground">Why flagged</div>
                  <p className="text-xs text-muted-foreground">{selectedRow.reason}</p>
                </div>
                <div className="rounded-md border p-3">
                  <div className="mb-1 text-xs text-muted-foreground">Inventory basis</div>
                  <p className="text-xs text-muted-foreground">
                    {selectedRow.onHandSource === "provided"
                      ? "Risk is based on provided stock-on-hand values."
                      : "Risk is based on forecast-derived inventory proxies; connect live inventory to improve precision."}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
        <div className="flex items-center gap-2 font-medium">
          <TriangleAlert className="h-4 w-4" />
          Advisory Scope
        </div>
        <p className="mt-1">
          This module does not place purchase orders or execute supplier payments. It only highlights replenishment risk.
        </p>
      </div>
    </div>
  )
}
