"use client"

import {KpiNavigatorTable} from "@/components/kpi-navigator/kpi-navigator-table";
import {KpiNavigatorRow} from "@/components/kpi-navigator/kpi-navigator-row";
import {KpiNavigatorControlRow} from "@/components/kpi-navigator/kpi-navigator-control-row";

export const KpiNavigator = () => {
    const generateMonths = () => {
        const months = []
        const currentDate = new Date()

        for (let i = 0; i < 12; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
            const month = (date.getMonth() + 1).toString()
            const year = date.getFullYear().toString()
            months.push(`${month}/${year}`)
        }

        return months
    }

    const months = generateMonths()

    return (
        <div className="container mx-auto py-8 px-4">
        <div className="min-h-screen bg-background">
            <div className="mx-auto px-6 py-6">
                <div className="bg-white rounded-lg shadow-sm p-3">
                    <h1 className="text-2xl font-bold text-gray-900">KPI Navigator</h1>
                </div>
            </div>
            <div className="mx-auto px-6 py-6 space-y-4">
                <KpiNavigatorRow/>
                <KpiNavigatorControlRow/>
                <KpiNavigatorTable months={months}/>
            </div>
        </div>
        </div>
    )
}