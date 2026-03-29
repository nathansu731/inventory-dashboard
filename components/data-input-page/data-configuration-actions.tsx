import { Button } from "@/components/ui/button"

type DataConfigurationActionsProps = {
  canSaveForecastDefaults: boolean
  isSavingForecastDefaults: boolean
  onSaveForecastDefaults: () => void
  canSaveSourceConfiguration: boolean
  isSavingSourceConfiguration: boolean
  onSaveSourceConfiguration: () => void
  forecastDefaultsMessage?: string | null
  forecastDefaultsIsError?: boolean
}

export const DataConfigurationActions = ({
  canSaveForecastDefaults,
  isSavingForecastDefaults,
  onSaveForecastDefaults,
  canSaveSourceConfiguration,
  isSavingSourceConfiguration,
  onSaveSourceConfiguration,
  forecastDefaultsMessage,
  forecastDefaultsIsError = false,
}: DataConfigurationActionsProps) => {
  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onSaveForecastDefaults} disabled={!canSaveForecastDefaults || isSavingForecastDefaults}>
          {isSavingForecastDefaults ? "Saving..." : "Save Forecast Defaults"}
        </Button>
        <Button variant="outline" onClick={onSaveSourceConfiguration} disabled={!canSaveSourceConfiguration || isSavingSourceConfiguration}>
          {isSavingSourceConfiguration ? "Saving..." : "Save Source Configuration"}
        </Button>
      </div>
      {forecastDefaultsMessage && (
        <p className={`text-sm ${forecastDefaultsIsError ? "text-destructive" : "text-muted-foreground"}`}>{forecastDefaultsMessage}</p>
      )}
    </div>
  )
}
