"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ForecastRunOption } from "@/lib/forecast-runs"
import { buildRunOptionLabel } from "@/lib/forecast-runs"

type ForecastRunSelectorProps = {
  runs: ForecastRunOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
}

export const ForecastRunSelector = ({
  runs,
  value,
  onValueChange,
  placeholder = "Select run",
}: ForecastRunSelectorProps) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[320px] max-w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {runs.map((run) => (
          <SelectItem key={run.runId} value={run.runId}>
            {buildRunOptionLabel(run)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
