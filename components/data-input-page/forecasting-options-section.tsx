import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type React from "react"

type ForecastingOptionsSectionProps = {
  forecastHorizon: string
  setForecastHorizon: React.Dispatch<React.SetStateAction<string>>
  plan: string
  mode: string
  setMode: React.Dispatch<React.SetStateAction<string>>
  model: string
  setModel: React.Dispatch<React.SetStateAction<string>>
  seasonality: string
  setSeasonality: React.Dispatch<React.SetStateAction<string>>
  availableModels: string[]
  allowGlobal: boolean
}

export const ForecastingOptionsSection = ({
  forecastHorizon,
  setForecastHorizon,
  plan,
  mode,
  setMode,
  model,
  setModel,
  seasonality,
  setSeasonality,
  availableModels,
  allowGlobal,
}: ForecastingOptionsSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Forecasting Options</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Plan</Label>
            <div className="text-sm capitalize text-muted-foreground">{plan || "launch"}</div>
          </div>
          <div className="space-y-2">
            <Label>Mode</Label>
            <Select value={mode} onValueChange={setMode} disabled={!allowGlobal}>
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local</SelectItem>
                <SelectItem value="global" disabled={!allowGlobal}>
                  Global
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Forecast Horizon</Label>
            <Select value={forecastHorizon} onValueChange={setForecastHorizon}>
              <SelectTrigger>
                <SelectValue placeholder="Select horizon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="14">14 periods</SelectItem>
                <SelectItem value="30">30 periods</SelectItem>
                <SelectItem value="60">60 periods</SelectItem>
                <SelectItem value="90">90 periods</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Seasonality</Label>
            <Select value={seasonality} onValueChange={setSeasonality}>
              <SelectTrigger>
                <SelectValue placeholder="Auto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}
