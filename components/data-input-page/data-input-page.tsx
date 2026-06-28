"use client"

import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { useCallback, useState } from "react"
import { DataSourceSelection } from "@/components/data-input-page/data-source-selection"
import { FileUploadSection } from "@/components/data-input-page/file-upload-section"
import { InventoryUploadSection } from "@/components/data-input-page/inventory-upload-section"
import { DataConfiguration } from "@/components/data-input-page/data-configuration"
import { DataQualityIndicator } from "@/components/data-input-page/data-quality-indicator"
import { ForecastAssistantOnboarding } from "@/components/data-input-page/forecast-assistant-onboarding"
import { DataInputActionsRow } from "@/components/data-input-page/data-input-actions-row"
import { ForecastRunAssumptionsDialog } from "@/components/data-input-page/forecast-run-assumptions-dialog"
import { SourceOpsHealthSection } from "@/components/data-input-page/source-ops-health-section"
import { ImportSummarySection } from "@/components/data-input-page/import-summary-section"
import { RecentSourceActivitySection } from "@/components/data-input-page/recent-source-activity-section"
import { ForecastRunStatusSection } from "@/components/data-input-page/forecast-run-status-section"
import { useDataInputController, type ForecastRunAssumptionsPrompt } from "@/components/data-input-page/use-data-input-controller"
import { FieldConfigurationSection } from "@/components/data-input-page/field-configuration-section"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const DataInputPage = () => {
  const vm = useDataInputController()
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null)
  const [assumptionsOpen, setAssumptionsOpen] = useState(false)
  const [assumptionsPrompt, setAssumptionsPrompt] = useState<ForecastRunAssumptionsPrompt | null>(null)
  const [localSeriesLimitOpen, setLocalSeriesLimitOpen] = useState(false)
  const [targetValidationOpen, setTargetValidationOpen] = useState(false)

  const focusSection = useCallback((sectionId: string, focusId?: string, openAdvanced?: boolean) => {
    if (openAdvanced) {
      setAdvancedOpen(true)
    }
    window.setTimeout(() => {
      const section = document.getElementById(sectionId)
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "center" })
      }
      const focusTarget = focusId ? document.getElementById(focusId) : section
      if (focusTarget instanceof HTMLElement) {
        focusTarget.focus({ preventScroll: true })
      }
      setHighlightedSection(sectionId)
      window.setTimeout(() => setHighlightedSection((prev) => (prev === sectionId ? null : prev)), 2200)
    }, openAdvanced ? 120 : 0)
  }, [])

  const handleAssistantAction = useCallback(
    (action: { id: string; label: string; route: string | null; kind: string } | null, stepTitle: string) => {
      const key = `${action?.id || ""} ${action?.label || ""} ${stepTitle || ""}`.toLowerCase()
      if (
        key.includes("advanced") ||
        key.includes("review settings") ||
        key.includes("review forecast settings") ||
        key.includes("settings") ||
        key.includes("horizon") ||
        key.includes("model") ||
        key.includes("seasonality")
      ) {
        focusSection("assistant-advanced-settings", "assistant-advanced-settings-summary", true)
        return true
      }
      if (key.includes("input data") || key.includes("upload") || key.includes("data input method")) {
        focusSection("assistant-input-data")
        return true
      }
      if (key.includes("run forecast") || key.includes("start forecast")) {
        focusSection("assistant-run-forecast", "assistant-start-forecast-button")
        return true
      }
      return false
    },
    [focusSection]
  )

  const highlightClass = (id: string) =>
    highlightedSection === id ? "ring-2 ring-amber-400 bg-amber-50/40 rounded-lg transition-all duration-300" : ""

  const handleStartForecast = useCallback(() => {
    if (vm.targetColumnValidation && (!vm.targetColumnValidation.targetColumn || vm.targetColumnValidation.invalidRowCount > 0)) {
      setTargetValidationOpen(true)
      return
    }
    if (vm.mode === "local" && (vm.localSeriesEstimate?.count || 0) > 100) {
      setLocalSeriesLimitOpen(true)
      return
    }
    const prompt = vm.buildForecastRunAssumptionsPrompt()
    if (!prompt) {
      void vm.startForecasting()
      return
    }
    setAssumptionsPrompt(prompt)
    setAssumptionsOpen(true)
  }, [vm])

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[2000px] mx-auto p-5 min-w-0 space-y-5">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Data Input</h1>
          <p className="text-muted-foreground">Upload and configure your forecasting data sources</p>
        </div>

        <ForecastAssistantOnboarding
          runId={vm.runStatus?.runId || vm.latestRunId}
          hasUploadedFile={Boolean(vm.uploadedFile)}
          hasConnectedSource={vm.connectionState === "connected"}
          runStatus={vm.runStatus}
          onAction={handleAssistantAction}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <DataSourceSelection
            availableObjects={vm.availableObjects}
            defaultSelectedObjects={vm.defaultSelectedObjects}
            provider={vm.provider}
            setProvider={vm.setProvider}
            blueprint={vm.activeBlueprint}
            diagnostics={vm.activeDiagnostics}
            connectionState={vm.connectionState}
            connectedAccount={vm.connectedAccount}
            connectedAt={vm.connectedAt}
            canManageSources={vm.canManageSources}
            onConnect={vm.handleConnect}
            onDisconnect={vm.handleDisconnect}
          />
          <div id="assistant-input-data" className={`space-y-6 ${highlightClass("assistant-input-data")}`}>
            <Tabs defaultValue="file-upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file-upload">File Upload</TabsTrigger>
                <TabsTrigger value="inventory-snapshot">Inventory Snapshot</TabsTrigger>
              </TabsList>
              <TabsContent value="file-upload" className="mt-4">
                <FileUploadSection
                  handleFileUpload={vm.handleFileUpload}
                  handleFileDrop={vm.handleFileDrop}
                  uploadedFile={vm.uploadedFile}
                  isProcessing={vm.isProcessing}
                  uploadProgress={vm.uploadProgress}
                />
              </TabsContent>
              <TabsContent value="inventory-snapshot" className="mt-4">
                <InventoryUploadSection
                  handleInventoryFileUpload={vm.handleInventoryFileUpload}
                  handleInventoryFileDrop={vm.handleInventoryFileDrop}
                  clearInventorySnapshot={vm.clearInventorySnapshot}
                  inventoryFile={vm.inventoryFile}
                  inventoryStatus={vm.inventoryStatus}
                  inventoryActionMessage={vm.inventoryActionMessage}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <FieldConfigurationSection
          uploadedColumns={vm.uploadedColumns}
          dateFormat={vm.dateFormat}
          setDateFormat={vm.setDateFormat}
          skuColumnName={vm.skuColumnName}
          setSkuColumnName={vm.setSkuColumnName}
          storeColumnName={vm.storeColumnName}
          setStoreColumnName={vm.setStoreColumnName}
          targetVariable={vm.targetVariable}
          setTargetVariable={vm.setTargetVariable}
          onHandColumnName={vm.onHandColumnName}
          setOnHandColumnName={vm.setOnHandColumnName}
          priceColumnName={vm.priceColumnName}
          setPriceColumnName={vm.setPriceColumnName}
          holidayColumnName={vm.holidayColumnName}
          setHolidayColumnName={vm.setHolidayColumnName}
          promotionColumnName={vm.promotionColumnName}
          setPromotionColumnName={vm.setPromotionColumnName}
          openStatusColumnName={vm.openStatusColumnName}
          setOpenStatusColumnName={vm.setOpenStatusColumnName}
        />

        <details
          id="assistant-advanced-settings"
          className={`group mt-4 rounded-lg border bg-background ${highlightClass("assistant-advanced-settings")}`}
          open={advancedOpen}
          onToggle={(event) => setAdvancedOpen((event.target as HTMLDetailsElement).open)}
        >
          <summary
            id="assistant-advanced-settings-summary"
            className="flex cursor-pointer list-none items-center justify-between border-b px-4 py-3 text-sm font-medium"
          >
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
              blueprint={vm.activeBlueprint}
              diagnostics={vm.activeDiagnostics}
              connectionState={vm.connectionState}
              availableTables={vm.availableObjects}
              selectedTables={vm.selectedTables}
              setSelectedTables={vm.setSelectedTables}
              effectiveSelectedTables={vm.effectiveSelectedTables}
              syncMode={vm.syncMode}
              setSyncMode={vm.setSyncMode}
              sourceConfig={vm.sourceConfig}
              setSourceConfig={vm.setSourceConfig}
              forecastHorizon={vm.forecastHorizon}
              setForecastHorizon={vm.setForecastHorizon}
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

        {vm.runStatus && <ForecastRunStatusSection runStatus={vm.runStatus} />}

        <div id="assistant-run-forecast" className={highlightClass("assistant-run-forecast")}>
          <DataInputActionsRow
            canManageSources={vm.canManageSources}
            isImportRunning={vm.importSummary.status === "running"}
            canRunImportNow={Boolean(vm.activeSource && vm.connectionState === "connected" && vm.canManageSources)}
            isProcessing={vm.isProcessing}
            hasUploadedFile={Boolean(vm.uploadedFile || vm.activeSource?.latestImport)}
            startForecastButtonId="assistant-start-forecast-button"
            onRunDueImports={vm.runDueImports}
            onRunImportNow={vm.runImportNow}
            onStartForecasting={handleStartForecast}
          />
        </div>

        {vm.healthSummary && <SourceOpsHealthSection summary={vm.healthSummary} providers={vm.healthProviders} />}

        <DataQualityIndicator uploadedFile={vm.uploadedFile} isProcessing={vm.isProcessing} />
        <ImportSummarySection summary={vm.importSummary} />
        <RecentSourceActivitySection auditEvents={vm.auditEvents} />
      </div>

      <ForecastRunAssumptionsDialog
        open={assumptionsOpen}
        prompt={assumptionsPrompt}
        isSubmitting={vm.isProcessing}
        onOpenChange={setAssumptionsOpen}
        onConfirm={(assumptions) => {
          setAssumptionsOpen(false)
          void vm.startForecasting(assumptions)
        }}
      />


      <Dialog open={targetValidationOpen} onOpenChange={setTargetValidationOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invalid forecast target values</DialogTitle>
            <DialogDescription>
              {!vm.targetColumnValidation?.targetColumn
                ? `The selected target column ${vm.targetVariable || "(empty)"} was not found in the uploaded CSV.`
                : `${vm.targetColumnValidation.targetColumn} contains ${vm.targetColumnValidation.invalidRowCount} invalid value(s) out of ${vm.targetColumnValidation.totalRows} rows. Forecasting was not started.`}
            </DialogDescription>
          </DialogHeader>
          {vm.targetColumnValidation?.targetColumn && vm.targetColumnValidation.invalidRowCount > 0 && (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                Valid rows: {vm.targetColumnValidation.validRows}<br />
                Invalid rows: {vm.targetColumnValidation.invalidRowCount}
              </div>
              <div className="rounded-md border p-3 text-sm">
                <div className="font-medium text-foreground">Example invalid rows</div>
                <div className="mt-2 space-y-2 text-muted-foreground">
                  {vm.targetColumnValidation.exampleInvalidRows.map((row) => (
                    <div key={`${row.rowNumber}-${row.sku || "na"}-${row.store || "na"}`}>
                      Row {row.rowNumber}: value {row.rawValue ? `"${row.rawValue}"` : "(blank)"}
                      {row.sku ? `, SKU ${row.sku}` : ""}
                      {row.store ? `, store ${row.store}` : ""}
                      {` (${row.reason})`}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTargetValidationOpen(false)}>
              Review file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={localSeriesLimitOpen} onOpenChange={setLocalSeriesLimitOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Local model limit reached</DialogTitle>
            <DialogDescription>
              This file contains {vm.localSeriesEstimate?.count || 0} SKU-location series. Local models support up to 100 series per run.
              Switch to global mode or reduce the dataset before starting the run.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            Detected SKU column: {vm.localSeriesEstimate?.skuColumn || "default SKU"}<br />
            Detected store column: {vm.localSeriesEstimate?.storeColumn || "default location"}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocalSeriesLimitOpen(false)}>
              Review mapping
            </Button>
            <Button
              onClick={() => {
                vm.setMode("global")
                setLocalSeriesLimitOpen(false)
              }}
            >
              Switch to global
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(vm.pageErrorDetails)} onOpenChange={(open) => {
        if (!open) vm.clearPageError()
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{vm.pageErrorDetails?.title || "Data upload issue"}</DialogTitle>
            <DialogDescription>{vm.pageErrorDetails?.error || vm.pageError || "Something went wrong."}</DialogDescription>
          </DialogHeader>
          {vm.pageErrorDetails?.retryAfterSeconds ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              Retry after: {vm.pageErrorDetails.retryAfterSeconds} seconds
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={vm.clearPageError}>
              Close
            </Button>
            <Button asChild>
              <Link href={vm.pageErrorDetails?.helpCenterHref || "/help-center"} onClick={vm.clearPageError}>
                Help Center
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
