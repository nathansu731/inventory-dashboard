"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarRange, Info, Plus, Sparkles, Trash2 } from "lucide-react"

import type { ForecastFutureAssumptions, ForecastRunAssumptionsPrompt } from "@/components/data-input-page/use-data-input-controller"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type FutureDateRange = {
  startDate: string
  endDate: string
}

type ForecastRunAssumptionsDialogProps = {
  open: boolean
  prompt: ForecastRunAssumptionsPrompt | null
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (assumptions: ForecastFutureAssumptions) => void
}

const emptyDateRange = (): FutureDateRange => ({ startDate: "", endDate: "" })
const AUSTRALIAN_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"] as const

export const ForecastRunAssumptionsDialog = ({
  open,
  prompt,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: ForecastRunAssumptionsDialogProps) => {
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([])
  const [storeState, setStoreState] = useState("")
  const [holidayRanges, setHolidayRanges] = useState<FutureDateRange[]>([])
  const [promotionRanges, setPromotionRanges] = useState<FutureDateRange[]>([])

  useEffect(() => {
    if (!prompt || !open) return
    setSelectedWeekdays(prompt.detectedClosedWeekdays.map((item) => item.weekday))
    setStoreState(prompt.stateCandidates.length === 1 ? prompt.stateCandidates[0] : "")
    setHolidayRanges(prompt.askHolidayRanges ? [emptyDateRange()] : [])
    setPromotionRanges(prompt.askPromotionRanges ? [emptyDateRange()] : [])
  }, [open, prompt])

  const filteredHolidayRanges = useMemo(
    () => holidayRanges.filter((range) => range.startDate && range.endDate),
    [holidayRanges]
  )
  const filteredPromotionRanges = useMemo(
    () => promotionRanges.filter((range) => range.startDate && range.endDate),
    [promotionRanges]
  )

  if (!prompt) return null

  const updateRanges = (
    ranges: FutureDateRange[],
    setRanges: (ranges: FutureDateRange[]) => void,
    index: number,
    field: keyof FutureDateRange,
    value: string
  ) => {
    setRanges(ranges.map((range, rangeIndex) => (rangeIndex === index ? { ...range, [field]: value } : range)))
  }

  const renderRangeList = (
    title: string,
    description: string,
    ranges: FutureDateRange[],
    setRanges: (ranges: FutureDateRange[]) => void
  ) => (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-3">
        {ranges.map((range, index) => (
          <div key={`${title}-${index}`} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              type="date"
              value={range.startDate}
              min={prompt.forecastWindowStart || undefined}
              max={prompt.forecastWindowEnd || undefined}
              onChange={(event) => updateRanges(ranges, setRanges, index, "startDate", event.target.value)}
            />
            <Input
              type="date"
              value={range.endDate}
              min={range.startDate || prompt.forecastWindowStart || undefined}
              max={prompt.forecastWindowEnd || undefined}
              onChange={(event) => updateRanges(ranges, setRanges, index, "endDate", event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              className="sm:w-10"
              onClick={() => setRanges(ranges.length === 1 ? [emptyDateRange()] : ranges.filter((_, rangeIndex) => rangeIndex !== index))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" className="gap-2" onClick={() => setRanges([...ranges, emptyDateRange()])}>
        <Plus className="h-4 w-4" />
        Add Date Range
      </Button>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Forecast Assumptions
          </DialogTitle>
          <DialogDescription>
            Confirm the future conditions that should apply for this run.
            {prompt.forecastWindowStart && prompt.forecastWindowEnd
              ? ` Forecast window: ${prompt.forecastWindowStart} to ${prompt.forecastWindowEnd}.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {prompt.detectedClosedWeekdays.length > 0 && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold">Store Open Pattern</h4>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground transition-colors hover:text-foreground" aria-label="More info">
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs text-left">
                    The uploaded history suggests some weekdays behave like closure days. Keep the ones that should stay closed in the coming forecast period.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="space-y-3">
                {prompt.detectedClosedWeekdays.map((suggestion) => {
                  const checked = selectedWeekdays.includes(suggestion.weekday)
                  return (
                    <label
                      key={suggestion.weekday}
                      className="flex items-start gap-3 rounded-md border px-3 py-3 hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => {
                          setSelectedWeekdays((prev) =>
                            next ? Array.from(new Set([...prev, suggestion.weekday])) : prev.filter((weekday) => weekday !== suggestion.weekday)
                          )
                        }}
                      />
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{`Looks like you are closed on ${suggestion.label}s. Keep that for coming days?`}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {prompt.askStoreState && (
            <div className="space-y-2 rounded-lg border p-4">
              <Label htmlFor="forecast-store-location">Store Location</Label>
              <Select value={storeState} onValueChange={setStoreState}>
                <SelectTrigger id="forecast-store-location" className="w-full">
                  <SelectValue placeholder="Select Australian state" />
                </SelectTrigger>
                <SelectContent>
                  {AUSTRALIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {prompt.askHolidayRanges &&
            renderRangeList(
              "Holiday Dates",
              "Add date ranges that should be treated as holiday periods in the forecast window.",
              holidayRanges,
              setHolidayRanges
            )}

          {prompt.askPromotionRanges &&
            renderRangeList(
              "Promotion Dates",
              "Add date ranges that should be treated as promotion periods in the forecast window.",
              promotionRanges,
              setPromotionRanges
            )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            className="gap-2"
            disabled={isSubmitting}
            onClick={() =>
              onConfirm({
                storeState: storeState.trim(),
                closedWeekdays: selectedWeekdays.sort((a, b) => a - b),
                holidayRanges: filteredHolidayRanges,
                promotionRanges: filteredPromotionRanges,
              })
            }
          >
            <CalendarRange className="h-4 w-4" />
            {isSubmitting ? "Starting..." : "Start Forecast"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
