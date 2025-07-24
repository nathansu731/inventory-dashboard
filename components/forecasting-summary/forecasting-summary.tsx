"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Filter, RefreshCw, Settings, Columns } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {ForecastingSummaryHeader} from "@/components/forecasting-summary/forecasting-summary-header";
import {ForecastingSummaryDropdown} from "@/components/forecasting-summary/forecasting-summary-dropdown";
import {ForecastingSummaryHeaderColumnSelectors} from "@/components/forecasting-summary/forecasting-summary-header-column-selectors";
import {ForecastingSummaryFooter} from "@/components/forecasting-summary/forecasting-summary-footer";
import {ForecastingSummaryTableLazy} from "@/components/forecasting-summary/forecasting-summary-table-lazy";
import {forecastData, testData} from "@/components/forecasting-summary/test-data";

export const ForecastingSummary = () => {
    const [selectedItems, setSelectedItems] = useState<string[]>([])
    const [selectAll, setSelectAll] = useState(false)
    const [hasMoreData, setHasMoreData] = useState(true);

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

    type ForecastDataItem = {
        id: string;
        store: string;
        description: string;
        forecastMethod: string;
        abcClass: string;
        abcPercentage: number;
        approved: boolean;
    };

    const [isLoading, setIsLoading] = useState(false);
    const [forecastDataNewTest, setForecastDataNewTest] = useState<ForecastDataItem[]>(forecastData);

    const loadMoreItems = async () => {
        if (isLoading || !hasMoreData) return;
        setIsLoading(true);
        const newItems = testData;
        if (newItems.length === 0) {
            setHasMoreData(false);
        } else {
            const newUniqueItems = newItems.filter(
                (item) => !forecastDataNewTest.find((existing) => existing.id === item.id)
            );

            if (newUniqueItems.length === 0) {
                setHasMoreData(false);
            } else {
                setForecastDataNewTest((prev) => [...prev, ...newUniqueItems]);
            }
        }

        setIsLoading(false);
    };

    const [isColumnModalOpen, setIsColumnModalOpen] = useState(false)

    const handleSelectAll = (checked: boolean) => {
        setSelectAll(checked)
        if (checked) {
            setSelectedItems(forecastData.map((item) => item.id))
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
            <ForecastingSummaryHeader/>
            <div className="container mx-auto px-6 py-6">
                <div className="flex items-center justify-between mb-6">
                    <ForecastingSummaryDropdown/>
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
                                <ForecastingSummaryHeaderColumnSelectors setIsColumnModalOpen={setIsColumnModalOpen}
                                 columnVisibility={columnVisibility}
                                 setColumnVisibility={setColumnVisibility}/>
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
                    forecastData={forecastDataNewTest}
                    selectedItems={selectedItems}
                    selectAll={selectAll}
                    handleSelectAll={handleSelectAll}
                    handleSelectItem={handleSelectItem}
                    columnVisibility={columnVisibility}
                    loadMoreItems={loadMoreItems}
                />
                <ForecastingSummaryFooter forecastData={forecastDataNewTest} selectedItems={selectedItems}/>
            </div>
        </div>
    )
}