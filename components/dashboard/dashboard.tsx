"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Filter, Package } from "lucide-react"
import {
    Sku,
    skuDetailData,
} from "@/components/dashboard/dashboard-data";
import {DashboardDetailModal} from "@/components/dashboard/dashboard-detail-modal";
import {DashboardMetricsTiles} from "@/components/dashboard/dashboard-metrics-tiles";
import {DashboardChartAndTable} from "@/components/dashboard/dashboard-chart-and-table";
import {DashboardRightPanel} from "@/components/dashboard/dashboard-right-panel";

export const DashboardBody = () => {
    const [viewMode, setViewMode] = useState<"chart" | "table">("chart")
    const [selectedCategory, setSelectedCategory] = useState("all")
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedSku, setSelectedSku] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const getRiskBadgeColor = (risk: string) => {
        switch (risk.toLowerCase()) {
            case "high":
                return "destructive"
            case "medium":
                return "default"
            case "low":
                return "secondary"
            default:
                return "default"
        }
    }

    const getAlertIcon = (type: string) => {
        switch (type) {
            case "critical":
                return "🔴"
            case "warning":
                return "🟡"
            case "info":
                return "🔵"
            default:
                return "ℹ️"
        }
    }

    const openSkuModal = (sku: string) => {
        setSelectedSku(sku)
        setIsModalOpen(true)
    }

    const getSelectedSkuData = () : Sku | null => {
        if (!selectedSku) return null
        return skuDetailData[selectedSku as keyof typeof skuDetailData] || null
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">SKU Forecasting Dashboard</h1>
                        <p className="text-gray-600">Monitor inventory forecasts and demand patterns</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm">
                            <Filter className="w-4 h-4 mr-2" />
                            Export Report
                        </Button>
                        <Button size="sm">
                            <Package className="w-4 h-4 mr-2" />
                            Add SKU
                        </Button>
                    </div>
                </div>
            </header>
            <div className="flex flex-col md:flex-row">
                <div className="flex-1 p-6">
                    <DashboardMetricsTiles/>
                    <DashboardChartAndTable viewMode={viewMode} setViewMode={setViewMode} searchTerm={searchTerm} setSearchTerm={setSearchTerm} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} openSkuModal={openSkuModal} getRiskBadgeColor={getRiskBadgeColor}/>
                </div>
                <DashboardRightPanel getAlertIcon={getAlertIcon}/>
            </div>
            <DashboardDetailModal
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                selectedSku={selectedSku}
                getSelectedSkuData={getSelectedSkuData}
            />
        </div>
    )
}