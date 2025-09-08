"use client"

import { useState } from "react"
import { TrendingUp } from "lucide-react"
import {Config} from "@/components/configurations/configurations-types";
import {DataSourceConfiguration} from "@/components/configurations/data-source-configuration";
import {ForecastParameters} from "@/components/configurations/forecast-parameters";
import {ModelConfiguration} from "@/components/configurations/model-configuration";
import {ActionButtons} from "@/components/configurations/action-buttons";

export const Configurations = () => {
    const [config, setConfig] = useState<Config>({
        computeFromAggregation: true,
        forecastHorizon: 30,
        forecastStartDate: new Date().toISOString().split("T")[0],
        initialConsensus: 0.5,
        confidenceInterval: 95,
        seasonalityDetection: "auto",
        modelType: "ensemble",
        dataFrequency: "daily",
        outlierDetection: true,
        trendDamping: false,
        minHistoryPeriods: 10,
    })

    const handleConfigChange = (key: string, value: any) => {
        setConfig((prev) => ({ ...prev, [key]: value }))
    }

    const handleSave = () => {
        console.log("Saving forecast configuration:", config)
    }

    const handleReset = () => {
        setConfig({
            computeFromAggregation: true,
            forecastHorizon: 30,
            forecastStartDate: new Date().toISOString().split("T")[0],
            initialConsensus: 0.5,
            confidenceInterval: 95,
            seasonalityDetection: "auto",
            modelType: "ensemble",
            dataFrequency: "daily",
            outlierDetection: true,
            trendDamping: false,
            minHistoryPeriods: 10,
        })
    }

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="mx-auto max-w-4xl space-y-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Forecast Configuration</h1>
                            <p className="text-muted-foreground">Configure parameters for your forecasting models</p>
                        </div>
                    </div>
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                    <DataSourceConfiguration config={config} handleConfigChange={handleConfigChange}/>
                    <ForecastParameters config={config} handleConfigChange={handleConfigChange}/>
                    <ModelConfiguration config={config} handleConfigChange={handleConfigChange}/>
                </div>
                <ActionButtons handleReset={handleReset} handleSave={handleSave}/>
            </div>
        </div>
    )
}