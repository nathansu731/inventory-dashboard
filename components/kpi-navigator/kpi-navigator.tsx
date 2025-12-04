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
        <div className="min-h-screen bg-background">
            <div className="container max-w-[2000px] mx-auto px-5 py-8 min-w-0">
            <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">KPI Navigator</h1>
            </div>
            <div className="mx-auto py-6 space-y-4 min-w-0">
                <KpiNavigatorRow/>
                <KpiNavigatorControlRow/>
                <KpiNavigatorTable months={months}/>
            </div>
            </div>
        </div>
    )
}