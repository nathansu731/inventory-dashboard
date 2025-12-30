"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, Filter, RefreshCw, Settings, Columns } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ForecastingSummaryHeader } from "@/components/forecasting-summary/forecasting-summary-header"
import { ForecastingSummaryDropdown } from "@/components/forecasting-summary/forecasting-summary-dropdown"
import { ForecastingSummaryHeaderColumnSelectors } from "@/components/forecasting-summary/forecasting-summary-header-column-selectors"
import { ForecastingSummaryFooter } from "@/components/forecasting-summary/forecasting-summary-footer"
import { ForecastingSummaryTableLazy } from "@/components/forecasting-summary/forecasting-summary-table-lazy"

type ForecastDataItem = {
    id: string
    store: string
    description: string
    forecastMethod: string
    abcClass: string
    abcPercentage: number
    approved: boolean
}

const PAGE_SIZE = 5 // number of items to load per scroll

export const ForecastingSummary = () => {
    const [allForecastData, setAllForecastData] = useState<ForecastDataItem[]>([])
    const [forecastDataVisible, setForecastDataVisible] = useState<ForecastDataItem[]>([])
    const [selectedItems, setSelectedItems] = useState<string[]>([])
    const [selectAll, setSelectAll] = useState(false)
    const [hasMoreData, setHasMoreData] = useState(true)
    const [isLoading, setIsLoading] = useState(false)

    const [columnVisibility, setColumnVisibility] = useState({
        select: true,
        view: true,
        approved: true,
        skuId: true,
        store: true,
        description: true,
        forecastMethod: true,
        abcClass: true,
        abcPercentage: true,
    })

    const [isColumnModalOpen, setIsColumnModalOpen] = useState(false)

    // Fetch data from API on mount
    useEffect(() => {
        const fetchMetadata = async () => {
            setIsLoading(true)
            const res = await fetch("/api/get-skus-metadata")
            if (!res.ok) return

            const { result } = await res.json()
            const data = typeof result === "string" ? JSON.parse(result) : result

            const formattedData: ForecastDataItem[] = Object.entries(data).map(([skuId, value]: [string, any]) => ({
                id: skuId,
                store: value.store,
                description: value.skuDesc,
                forecastMethod: value.forecastMethod,
                abcClass: value.ABCclass,
                abcPercentage: value.ABCpercentage,
                approved: value.isApproved,
            }))

            setAllForecastData(formattedData)
            setForecastDataVisible(formattedData.slice(0, PAGE_SIZE))
            setHasMoreData(formattedData.length > PAGE_SIZE)
            setIsLoading(false)
        }

        fetchMetadata()
    }, [])

    const loadMoreItems = () => {
        if (isLoading || !hasMoreData) return

        setIsLoading(true)
        const currentLength = forecastDataVisible.length
        const nextItems = allForecastData.slice(currentLength, currentLength + PAGE_SIZE)

        setForecastDataVisible((prev) => [...prev, ...nextItems])
        setHasMoreData(allForecastData.length > currentLength + PAGE_SIZE)
        setIsLoading(false)
    }

    const handleSelectAll = (checked: boolean) => {
        setSelectAll(checked)
        if (checked) {
            setSelectedItems(forecastDataVisible.map((item) => item.id))
        } else {
            setSelectedItems([])
        }
    }

    const handleSelectItem = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedItems([...selectedItems, id])
        } else {
            setSelectedItems(selectedItems.filter((item) => item !== id))
            setSelectAll(false)
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <ForecastingSummaryHeader />
            <div className="container mx-auto px-6 py-6">
                <div className="flex items-center justify-between mb-6">
                    <ForecastingSummaryDropdown />
                    <div className="flex items-center space-x-2">
                        <Dialog open={isColumnModalOpen} onOpenChange={setIsColumnModalOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="icon">
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
                        <Button variant="outline" size="icon">
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon">
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon">
                            <Filter className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon">
                            <Settings className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <ForecastingSummaryTableLazy
                    forecastData={forecastDataVisible}
                    selectedItems={selectedItems}
                    selectAll={selectAll}
                    handleSelectAll={handleSelectAll}
                    handleSelectItem={handleSelectItem}
                    columnVisibility={columnVisibility}
                    loadMoreItems={loadMoreItems}
                />
                <ForecastingSummaryFooter forecastData={forecastDataVisible} selectedItems={selectedItems} />
            </div>
        </div>
    )
}