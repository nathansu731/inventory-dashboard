import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type React from "react"

type ForecastingOptionsSectionProps = {
  dateFormat: string
  setDateFormat: React.Dispatch<React.SetStateAction<string>>
  targetVariable: string
  setTargetVariable: React.Dispatch<React.SetStateAction<string>>
  priceColumnName: string
  setPriceColumnName: React.Dispatch<React.SetStateAction<string>>
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
  dateFormat,
  setDateFormat,
  targetVariable,
  setTargetVariable,
  priceColumnName,
  setPriceColumnName,
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="date-format">Date Format</Label>
          <Select value={dateFormat} onValueChange={setDateFormat}>
            <SelectTrigger id="date-format">
              <SelectValue placeholder="Select date format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dd/mm/yyyy">dd/mm/yyyy</SelectItem>
              <SelectItem value="mm/dd/yyyy">mm/dd/yyyy</SelectItem>
              <SelectItem value="yyyy-mm-dd">yyyy-mm-dd</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="target-variable">Target variable for forecast</Label>
          <Input
            id="target-variable"
            value={targetVariable}
            onChange={(event) => setTargetVariable(event.target.value)}
            placeholder="quantity"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price-column-name">Price column name</Label>
          <Input
            id="price-column-name"
            value={priceColumnName}
            onChange={(event) => setPriceColumnName(event.target.value)}
            placeholder="price"
          />
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium">Forecasting Options</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Plan</Label>
            <div className="text-sm capitalize text-muted-foreground">{plan || "free"}</div>
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
                  Global (Pro)
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
