"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, RefreshCw, Columns } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ForecastingSummaryHeaderColumnSelectors } from "@/components/forecasting-summary/forecasting-summary-header-column-selectors"
import { ForecastingSummaryFooter } from "@/components/forecasting-summary/forecasting-summary-footer"
import { ForecastingSummaryTable } from "@/components/forecasting-summary/forecasting-summary-table"

type ForecastDataItem = {
    id: string
    store: string
    description: string
    forecastMethod: string
    abcClass: string
    abcPercentage: number
    approved: boolean
}

type ForecastMetadata = {
    store: string
    skuDesc: string
    forecastMethod: string
    ABCclass: string
    ABCpercentage: number
    isApproved: boolean
}

const DEFAULT_COLUMNS = {
    select: true,
    view: true,
    approved: true,
    skuId: true,
    store: true,
    description: true,
    forecastMethod: true,
    abcClass: true,
    abcPercentage: true,
}

export const ForecastingSummary = () => {
    const [allForecastData, setAllForecastData] = useState<ForecastDataItem[]>([])
    const [selectedItems, setSelectedItems] = useState<string[]>([])
    const [columnVisibility, setColumnVisibility] = useState(DEFAULT_COLUMNS)
    const [isColumnModalOpen, setIsColumnModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [searchText, setSearchText] = useState("")
    const [filterType, setFilterType] = useState<"store" | "sku">("store")
    const [filterValue, setFilterValue] = useState("all")
    const [error, setError] = useState<string | null>(null)

    const fetchMetadata = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/get-skus-metadata", { cache: "no-store" })
            if (!res.ok) {
                throw new Error(`API error (${res.status})`)
            }

            const { result } = await res.json()
            const data = (typeof result === "string" ? JSON.parse(result) : result) as Record<string, ForecastMetadata>
            const formattedData: ForecastDataItem[] = Object.entries(data || {}).map(([skuId, value]) => ({
                id: skuId,
                store: value.store,
                description: value.skuDesc,
                forecastMethod: value.forecastMethod,
                abcClass: value.ABCclass,
                abcPercentage: value.ABCpercentage,
                approved: value.isApproved,
            }))
            setAllForecastData(formattedData)
        } catch (e) {
            setAllForecastData([])
            setError(e instanceof Error ? e.message : "Failed to load forecasting summary")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchMetadata()
    }, [fetchMetadata])

    const stores = useMemo(() => {
        return Array.from(new Set(allForecastData.map((item) => item.store).filter(Boolean))).sort()
    }, [allForecastData])

    const skus = useMemo(() => {
        return allForecastData.map((item) => item.id).sort()
    }, [allForecastData])

    const filterOptions = filterType === "store" ? stores : skus

    useEffect(() => {
        setFilterValue("all")
    }, [filterType])

    const filteredData = useMemo(() => {
        const query = searchText.trim().toLowerCase()
        return allForecastData.filter((item) => {
            const filterMatch =
                filterValue === "all" || (filterType === "store" ? item.store === filterValue : item.id === filterValue)
            if (!filterMatch) return false

            if (!query) return true

            return (
                item.id.toLowerCase().includes(query) ||
                item.store.toLowerCase().includes(query) ||
                item.description.toLowerCase().includes(query) ||
                item.forecastMethod.toLowerCase().includes(query)
            )
        })
    }, [allForecastData, filterType, filterValue, searchText])

    const selectAll = filteredData.length > 0 && filteredData.every((item) => selectedItems.includes(item.id))

    const handleSelectAll = (checked: boolean) => {
        if (!checked) {
            setSelectedItems((prev) => prev.filter((id) => !filteredData.some((item) => item.id === id)))
            return
        }
        const visibleIds = filteredData.map((item) => item.id)
        setSelectedItems((prev) => Array.from(new Set([...prev, ...visibleIds])))
    }

    const handleSelectItem = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedItems((prev) => (prev.includes(id) ? prev : [...prev, id]))
            return
        }
        setSelectedItems((prev) => prev.filter((item) => item !== id))
    }

    const handleExportCsv = () => {
        if (filteredData.length === 0) return

        const headers: string[] = []
        if (columnVisibility.skuId) headers.push("SKU")
        if (columnVisibility.store) headers.push("Store")
        if (columnVisibility.description) headers.push("Description")
        if (columnVisibility.forecastMethod) headers.push("Forecast Method")
        if (columnVisibility.abcClass) headers.push("ABC Class")
        if (columnVisibility.abcPercentage) headers.push("ABC %")
        if (columnVisibility.approved) headers.push("Approved")

        const escapeCell = (value: string | number | boolean) => {
            const text = String(value)
            if (text.includes(",") || text.includes('"') || text.includes("\n")) {
                return `"${text.replace(/"/g, '""')}"`
            }
            return text
        }

        const rows = filteredData.map((item) => {
            const values: Array<string | number | boolean> = []
            if (columnVisibility.skuId) values.push(item.id)
            if (columnVisibility.store) values.push(item.store)
            if (columnVisibility.description) values.push(item.description)
            if (columnVisibility.forecastMethod) values.push(item.forecastMethod)
            if (columnVisibility.abcClass) values.push(item.abcClass)
            if (columnVisibility.abcPercentage) values.push(item.abcPercentage)
            if (columnVisibility.approved) values.push(item.approved)
            return values.map(escapeCell).join(",")
        })

        const csv = [headers.join(","), ...rows].join("\n")
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.setAttribute("download", "forecasting-summary.csv")
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-[2000px] mx-auto p-5 min-w-0 space-y-5">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Forecasting Summary</h1>
                    <p className="text-muted-foreground mt-1">Manage and review your demand forecasting results.</p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[280px]">
                        <Input
                            placeholder="Search by SKU, store, description or method"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="w-full md:w-[360px]"
                        />
                        <Select value={filterType} onValueChange={(value: "store" | "sku") => setFilterType(value)}>
                            <SelectTrigger className="w-[170px]">
                                <SelectValue placeholder="Filter by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="store">Filter by Store</SelectItem>
                                <SelectItem value="sku">Filter by SKU</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterValue} onValueChange={setFilterValue}>
                            <SelectTrigger className="w-[190px]">
                                <SelectValue placeholder={filterType === "store" ? "All stores" : "All SKUs"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {filterOptions.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Dialog open={isColumnModalOpen} onOpenChange={setIsColumnModalOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="icon" aria-label="Choose columns">
                                    <Columns className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Choose Columns</DialogTitle>
                                </DialogHeader>
                                <ForecastingSummaryHeaderColumnSelectors
                                    setIsColumnModalOpen={setIsColumnModalOpen}
                                    columnVisibility={columnVisibility}
                                    setColumnVisibility={setColumnVisibility}
                                />
                            </DialogContent>
                        </Dialog>
                        <Button variant="outline" size="icon" onClick={fetchMetadata} disabled={isLoading} aria-label="Refresh">
                            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleExportCsv}
                            disabled={filteredData.length === 0}
                            aria-label="Export table"
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {error ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                        Failed to load forecasting summary. {error}
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="rounded-md border bg-muted/30 p-8 text-center">
                        <p className="text-base font-medium">No forecasting summary data yet</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Upload data and run a forecast to populate this view.
                        </p>
                    </div>
                ) : (
                    <ForecastingSummaryTable
                        forecastData={filteredData}
                        selectedItems={selectedItems}
                        selectAll={selectAll}
                        handleSelectAll={handleSelectAll}
                        handleSelectItem={handleSelectItem}
                        columnVisibility={columnVisibility}
                    />
                )}

                <ForecastingSummaryFooter
                    totalItems={allForecastData.length}
                    visibleItems={filteredData.length}
                    selectedItems={selectedItems}
                />
            </div>
        </div>
    )
}
