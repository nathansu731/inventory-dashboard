"use client"

import { ChevronDown } from "lucide-react"
import { DataSourceSelection } from "@/components/data-input-page/data-source-selection"
import { FileUploadSection } from "@/components/data-input-page/file-upload-section"
import { DataConfiguration } from "@/components/data-input-page/data-configuration"
import { DataQualityIndicator } from "@/components/data-input-page/data-quality-indicator"
import { ForecastAssistantOnboarding } from "@/components/data-input-page/forecast-assistant-onboarding"
import { DataInputActionsRow } from "@/components/data-input-page/data-input-actions-row"
import { SourceOpsHealthSection } from "@/components/data-input-page/source-ops-health-section"
import { ImportSummarySection } from "@/components/data-input-page/import-summary-section"
import { RecentSourceActivitySection } from "@/components/data-input-page/recent-source-activity-section"
import { ForecastRunStatusSection } from "@/components/data-input-page/forecast-run-status-section"
import { useDataInputController } from "@/components/data-input-page/use-data-input-controller"

export const DataInputPage = () => {
  const vm = useDataInputController()

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[2000px] mx-auto p-5 min-w-0 space-y-5">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Data Input</h1>
          <p className="text-muted-foreground">Upload and configure your forecasting data sources</p>
        </div>

        <ForecastAssistantOnboarding runId={vm.runStatus?.runId || vm.latestRunId} />

        {vm.pageError && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{vm.pageError}</div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <FileUploadSection
              handleFileUpload={vm.handleFileUpload}
              handleFileDrop={vm.handleFileDrop}
              uploadedFile={vm.uploadedFile}
              isProcessing={vm.isProcessing}
              uploadProgress={vm.uploadProgress}
            />
          </div>
          <DataSourceSelection
            availableObjects={vm.availableObjects}
            defaultSelectedObjects={vm.defaultSelectedObjects}
            provider={vm.provider}
            setProvider={vm.setProvider}
            connectionState={vm.connectionState}
            connectedAccount={vm.connectedAccount}
            connectedAt={vm.connectedAt}
            canManageSources={vm.canManageSources}
            onConnect={vm.handleConnect}
            onDisconnect={vm.handleDisconnect}
          />
        </div>

        <DataInputActionsRow
          canManageSources={vm.canManageSources}
          isImportRunning={vm.importSummary.status === "running"}
          canRunImportNow={Boolean(vm.activeSource && vm.connectionState === "connected" && vm.canManageSources)}
          isProcessing={vm.isProcessing}
          hasUploadedFile={Boolean(vm.uploadedFile)}
          onRunDueImports={vm.runDueImports}
          onRunImportNow={vm.runImportNow}
          onStartForecasting={vm.startForecasting}
        />

        {vm.healthSummary && <SourceOpsHealthSection summary={vm.healthSummary} providers={vm.healthProviders} />}

        <details className="group mt-4 rounded-lg border bg-background">
          <summary className="flex cursor-pointer list-none items-center justify-between border-b px-4 py-3 text-sm font-medium">
            <span>Advanced Settings</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="">
            <DataConfiguration
              plan={vm.plan}
              model={vm.model}
              setModel={vm.setModel}
              mode={vm.mode}
              setMode={vm.setMode}
              seasonality={vm.seasonality}
              setSeasonality={vm.setSeasonality}
              availableModels={vm.availableModels}
              allowGlobal={vm.allowGlobal}
              provider={vm.provider}
              connectionState={vm.connectionState}
              availableTables={vm.availableObjects}
              selectedTables={vm.selectedTables}
              setSelectedTables={vm.setSelectedTables}
              syncMode={vm.syncMode}
              setSyncMode={vm.setSyncMode}
              dateFormat={vm.dateFormat}
              setDateFormat={vm.setDateFormat}
              targetVariable={vm.targetVariable}
              setTargetVariable={vm.setTargetVariable}
              priceColumnName={vm.priceColumnName}
              setPriceColumnName={vm.setPriceColumnName}
              lastImportAt={vm.activeSource?.lastImportAt || null}
              nextImportAt={vm.activeSource?.nextImportAt || null}
              retryCount={vm.activeSource?.retryCount || 0}
              lastError={vm.activeSource?.lastError || null}
              canManageSources={vm.canManageSources}
              canSaveSourceConfiguration={Boolean(vm.activeSource?.id) && vm.canManageSources}
              isSavingSourceConfiguration={vm.importSummary.status === "running"}
              onSaveSourceConfiguration={vm.saveSourceConfiguration}
              canSaveForecastDefaults={vm.canManageSources}
              isSavingForecastDefaults={vm.isSavingForecastDefaults}
              onSaveForecastDefaults={vm.saveForecastDefaults}
              forecastDefaultsMessage={vm.forecastDefaultsMessage}
              forecastDefaultsIsError={vm.forecastDefaultsIsError}
              adapterTemplates={vm.adapterTemplates}
              adapterConfig={vm.activeAdapter}
              setAdapterConfig={vm.setActiveAdapter}
            />
          </div>
        </details>

        <DataQualityIndicator uploadedFile={vm.uploadedFile} isProcessing={vm.isProcessing} />
        <ImportSummarySection summary={vm.importSummary} />
        <RecentSourceActivitySection auditEvents={vm.auditEvents} />
        {vm.runStatus && <ForecastRunStatusSection runStatus={vm.runStatus} />}
      </div>
    </div>
  )
}
