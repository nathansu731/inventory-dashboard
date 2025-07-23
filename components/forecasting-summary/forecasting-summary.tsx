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

export default function ForecastingSummary() {
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

// test data start

        const testData = [
            {
                id: "SKU006",
                store: "Store A",
                description: "Premium Coffee Beans - Dark Roast",
                forecastMethod: "ARIMA",
                abcClass: "A",
                abcPercentage: 87,
                approved: true,
            },
            {
                id: "SKU007",
                store: "Store B",
                description: "Organic Green Tea Bags",
                forecastMethod: "Linear Regression",
                abcClass: "B",
                abcPercentage: 65,
                approved: false,
            },
            {
                id: "SKU008",
                store: "Store A",
                description: "Artisan Chocolate Bar",
                forecastMethod: "Exponential Smoothing",
                abcClass: "A",
                abcPercentage: 92,
                approved: true,
            },
            {
                id: "SKU009",
                store: "Store C",
                description: "Herbal Tea Collection",
                forecastMethod: "ARIMA",
                abcClass: "C",
                abcPercentage: 45,
                approved: true,
            },
            {
                id: "SKU010",
                store: "Store B",
                description: "Specialty Coffee Filters",
                forecastMethod: "Moving Average",
                abcClass: "B",
                abcPercentage: 58,
                approved: false,
            },
            {
                id: "SKU006",
                store: "Store A",
                description: "Premium Coffee Beans - Dark Roast",
                forecastMethod: "ARIMA",
                abcClass: "A",
                abcPercentage: 87,
                approved: true
            },
            {
                id: "SKU007",
                store: "Store B",
                description: "Organic Green Tea Bags",
                forecastMethod: "Linear Regression",
                abcClass: "B",
                abcPercentage: 65,
                approved: false
            },
            {
                id: "SKU008",
                store: "Store A",
                description: "Artisan Chocolate Bar",
                forecastMethod: "Exponential Smoothing",
                abcClass: "A",
                abcPercentage: 92,
                approved: true
            },
            {
                id: "SKU009",
                store: "Store C",
                description: "Herbal Tea Collection",
                forecastMethod: "ARIMA",
                abcClass: "C",
                abcPercentage: 45,
                approved: true
            },
            {
                id: "SKU010",
                store: "Store B",
                description: "Specialty Coffee Filters",
                forecastMethod: "Moving Average",
                abcClass: "B",
                abcPercentage: 58,
                approved: false
            },
            {
                id: "SKU011",
                store: "Store A",
                description: "Cold Brew Coffee Kit",
                forecastMethod: "ARIMA",
                abcClass: "A",
                abcPercentage: 88,
                approved: true
            },
            {
                id: "SKU012",
                store: "Store B",
                description: "Loose Leaf Black Tea",
                forecastMethod: "Exponential Smoothing",
                abcClass: "B",
                abcPercentage: 70,
                approved: false
            },
            {
                id: "SKU013",
                store: "Store C",
                description: "French Press Coffee Maker",
                forecastMethod: "Linear Regression",
                abcClass: "A",
                abcPercentage: 90,
                approved: true
            },
            {
                id: "SKU014",
                store: "Store A",
                description: "Organic Chamomile Tea",
                forecastMethod: "Moving Average",
                abcClass: "C",
                abcPercentage: 49,
                approved: true
            },
            {
                id: "SKU015",
                store: "Store B",
                description: "Espresso Ground Coffee",
                forecastMethod: "ARIMA",
                abcClass: "A",
                abcPercentage: 85,
                approved: true
            },
            {
                id: "SKU016",
                store: "Store C",
                description: "Matcha Powder",
                forecastMethod: "Linear Regression",
                abcClass: "B",
                abcPercentage: 66,
                approved: false
            },
            {
                id: "SKU017",
                store: "Store A",
                description: "Iced Tea Pitcher",
                forecastMethod: "Exponential Smoothing",
                abcClass: "C",
                abcPercentage: 52,
                approved: true
            },
            {
                id: "SKU018",
                store: "Store B",
                description: "Cinnamon Spice Tea",
                forecastMethod: "ARIMA",
                abcClass: "B",
                abcPercentage: 63,
                approved: false
            },
            {
                id: "SKU019",
                store: "Store C",
                description: "Reusable Coffee Cups",
                forecastMethod: "Moving Average",
                abcClass: "C",
                abcPercentage: 40,
                approved: false
            },
            {
                id: "SKU020",
                store: "Store A",
                description: "Hazelnut Flavored Coffee",
                forecastMethod: "ARIMA",
                abcClass: "A",
                abcPercentage: 93,
                approved: true
            },
        ];
// test data end

    const forecastData = [
        {
            id: "SKU001",
            store: "Store A",
            description: "Premium Coffee Beans - Dark Roast",
            forecastMethod: "ARIMA",
            abcClass: "A",
            abcPercentage: 85,
            approved: true,
        },
        {
            id: "SKU002",
            store: "Store B",
            description: "Organic Green Tea Bags",
            forecastMethod: "Linear Regression",
            abcClass: "B",
            abcPercentage: 65,
            approved: false,
        },
        {
            id: "SKU003",
            store: "Store A",
            description: "Artisan Chocolate Bar",
            forecastMethod: "Exponential Smoothing",
            abcClass: "A",
            abcPercentage: 92,
            approved: true,
        },
        {
            id: "SKU004",
            store: "Store C",
            description: "Herbal Tea Collection",
            forecastMethod: "ARIMA",
            abcClass: "C",
            abcPercentage: 45,
            approved: true,
        },
        {
            id: "SKU005",
            store: "Store B",
            description: "Specialty Coffee Filters",
            forecastMethod: "Moving Average",
            abcClass: "B",
            abcPercentage: 58,
            approved: false,
        },
    ]

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
            {/* Header matching user profile style */}
            <ForecastingSummaryHeader/>
            {/* Main content */}
            <div className="container mx-auto px-6 py-6">
                {/* Controls row */}
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
                {/* Table */}
                <ForecastingSummaryTableLazy
                    forecastData={forecastDataNewTest}
                    selectedItems={selectedItems}
                    selectAll={selectAll}
                    handleSelectAll={handleSelectAll}
                    handleSelectItem={handleSelectItem}
                    columnVisibility={columnVisibility}
                    loadMoreItems={loadMoreItems}
                />
                {/* Footer info */}
                <ForecastingSummaryFooter forecastData={forecastDataNewTest} selectedItems={selectedItems}/>
            </div>
        </div>
    )
}