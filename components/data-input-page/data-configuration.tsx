import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import React from "react"
import type { ConnectorProvider, ConnectorState } from "@/components/data-input-page/data-source-selection"
import type { AdapterTemplate, DataSourceAdapterConfig } from "@/lib/data-source-adapters"
import { ConnectorImportSetupSection } from "@/components/data-input-page/connector-import-setup-section"
import { DataConfigurationActions } from "@/components/data-input-page/data-configuration-actions"
import { AdapterTemplateKitSection } from "@/components/data-input-page/adapter-template-kit-section"
import { ForecastingOptionsSection } from "@/components/data-input-page/forecasting-options-section"

type DataConfigurationProps = {
  plan: string
  model: string
  setModel: React.Dispatch<React.SetStateAction<string>>
  mode: string
  setMode: React.Dispatch<React.SetStateAction<string>>
  seasonality: string
  setSeasonality: React.Dispatch<React.SetStateAction<string>>
  availableModels: string[]
  allowGlobal: boolean
  provider: ConnectorProvider
  connectionState: ConnectorState
  availableTables: string[]
  selectedTables: string[]
  setSelectedTables: React.Dispatch<React.SetStateAction<string[]>>
  syncMode: string
  setSyncMode: React.Dispatch<React.SetStateAction<string>>
  dateFormat: string
  setDateFormat: React.Dispatch<React.SetStateAction<string>>
  targetVariable: string
  setTargetVariable: React.Dispatch<React.SetStateAction<string>>
  priceColumnName: string
  setPriceColumnName: React.Dispatch<React.SetStateAction<string>>
  lastImportAt: string | null
  nextImportAt: string | null
  retryCount: number
  lastError: string | null
  canManageSources: boolean
  canSaveSourceConfiguration: boolean
  isSavingSourceConfiguration: boolean
  onSaveSourceConfiguration: () => void
  canSaveForecastDefaults: boolean
  isSavingForecastDefaults: boolean
  onSaveForecastDefaults: () => void
  forecastDefaultsMessage?: string | null
  forecastDefaultsIsError?: boolean
  adapterTemplates: AdapterTemplate[]
  adapterConfig: DataSourceAdapterConfig | null
  setAdapterConfig: React.Dispatch<React.SetStateAction<DataSourceAdapterConfig | null>>
}

export const DataConfiguration = ({
  plan,
  model,
  setModel,
  mode,
  setMode,
  seasonality,
  setSeasonality,
  availableModels,
  allowGlobal,
  provider,
  connectionState,
  availableTables,
  selectedTables,
  setSelectedTables,
  syncMode,
  setSyncMode,
  dateFormat,
  setDateFormat,
  targetVariable,
  setTargetVariable,
  priceColumnName,
  setPriceColumnName,
  lastImportAt,
  nextImportAt,
  retryCount,
  lastError,
  canManageSources,
  canSaveSourceConfiguration,
  isSavingSourceConfiguration,
  onSaveSourceConfiguration,
  canSaveForecastDefaults,
  isSavingForecastDefaults,
  onSaveForecastDefaults,
  forecastDefaultsMessage,
  forecastDefaultsIsError = false,
  adapterTemplates,
  adapterConfig,
  setAdapterConfig,
}: DataConfigurationProps) => {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Data Configuration
        </CardTitle>
        <CardDescription>Set connector import options and forecasting parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ConnectorImportSetupSection
          provider={provider}
          connectionState={connectionState}
          canManageSources={canManageSources}
          availableTables={availableTables}
          selectedTables={selectedTables}
          setSelectedTables={setSelectedTables}
          syncMode={syncMode}
          setSyncMode={setSyncMode}
          lastImportAt={lastImportAt}
          nextImportAt={nextImportAt}
          retryCount={retryCount}
          lastError={lastError}
        />

        {provider === "other" && (
          <AdapterTemplateKitSection
            canManageSources={canManageSources}
            adapterTemplates={adapterTemplates}
            adapterConfig={adapterConfig}
            setAdapterConfig={setAdapterConfig}
          />
        )}

        <Separator />

        <ForecastingOptionsSection
          dateFormat={dateFormat}
          setDateFormat={setDateFormat}
          targetVariable={targetVariable}
          setTargetVariable={setTargetVariable}
          priceColumnName={priceColumnName}
          setPriceColumnName={setPriceColumnName}
          plan={plan}
          mode={mode}
          setMode={setMode}
          model={model}
          setModel={setModel}
          seasonality={seasonality}
          setSeasonality={setSeasonality}
          availableModels={availableModels}
          allowGlobal={allowGlobal}
        />

        <DataConfigurationActions
          canSaveForecastDefaults={canSaveForecastDefaults}
          isSavingForecastDefaults={isSavingForecastDefaults}
          onSaveForecastDefaults={onSaveForecastDefaults}
          canSaveSourceConfiguration={canSaveSourceConfiguration}
          isSavingSourceConfiguration={isSavingSourceConfiguration}
          onSaveSourceConfiguration={onSaveSourceConfiguration}
          forecastDefaultsMessage={forecastDefaultsMessage}
          forecastDefaultsIsError={forecastDefaultsIsError}
        />
      </CardContent>
    </Card>
  )
}
