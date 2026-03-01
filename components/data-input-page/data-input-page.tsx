"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DataSourceSelection, type ConnectorProvider, type ConnectorState } from "@/components/data-input-page/data-source-selection"
import { FileUploadSection } from "@/components/data-input-page/file-upload-section"
import { DataConfiguration } from "@/components/data-input-page/data-configuration"
import { DataQualityIndicator } from "@/components/data-input-page/data-quality-indicator"
import { useProfile } from "@/hooks/use-profile"
import type { AdapterTemplate, DataSourceAdapterConfig } from "@/lib/data-source-adapters"

type RunSummary = {
  runId?: string
  status?: string
  createdAt?: string
  updatedAt?: string
  message?: string
}

type ImportSummary = {
  status: "idle" | "running" | "success" | "error"
  message: string
}

type DataSourceItem = {
  id: string
  provider: ConnectorProvider
  accountName: string
  accountId?: string
  state: ConnectorState
  connectedAt: string | null
  selectedTables: string[]
  syncMode: "manual" | "every-6h" | "daily" | "weekly"
  syncStartDate: string
  lastImportAt: string | null
  nextImportAt: string | null
  retryCount: number
  lastError: string | null
}

type DataSourceAuditEvent = {
  id: string
  type: string
  actor: string
  actorType: "user" | "system"
  sourceId?: string
  provider?: string
  message: string
  createdAt: string
}

type AdapterMap = Record<string, DataSourceAdapterConfig>

type HealthProviderRow = {
  sourceId: string
  provider: string
  state: "connected" | "error" | "not_connected"
  syncMode: string
  retryCount: number
  lastError: string | null
  lastImportAt: string | null
  nextImportAt: string | null
  stale: boolean
}

type HealthSummary = {
  totalSources: number
  connected: number
  errored: number
  scheduled: number
  stale: number
  totalRetries: number
  success24h: number
  failures24h: number
  errorRate24h: number
}

type ProviderCatalogEntry = {
  objects: string[]
  defaultSelected: string[]
}

type ProviderCatalog = Partial<Record<ConnectorProvider, ProviderCatalogEntry>>

const readError = async (res: Response) => {
  try {
    const payload = (await res.json()) as { error?: string }
    return payload.error || `request_failed_${res.status}`
  } catch {
    return `request_failed_${res.status}`
  }
}

export const DataInputPage = () => {
  const searchParams = useSearchParams()
  const [provider, setProvider] = useState<ConnectorProvider>("shopify")
  const [sources, setSources] = useState<DataSourceItem[]>([])
  const [auditEvents, setAuditEvents] = useState<DataSourceAuditEvent[]>([])
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null)
  const [healthProviders, setHealthProviders] = useState<HealthProviderRow[]>([])
  const [canManageSources, setCanManageSources] = useState(true)
  const [adaptersBySourceId, setAdaptersBySourceId] = useState<AdapterMap>({})
  const [adapterTemplates, setAdapterTemplates] = useState<AdapterTemplate[]>([])
  const [providerCatalog, setProviderCatalog] = useState<ProviderCatalog>({})

  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [syncMode, setSyncMode] = useState("manual")
  const [syncStartDate, setSyncStartDate] = useState("")

  const [importSummary, setImportSummary] = useState<ImportSummary>({ status: "idle", message: "" })

  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [runStatus, setRunStatus] = useState<RunSummary | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)

  const { profile } = useProfile()
  const [model, setModel] = useState("arima")
  const [mode, setMode] = useState("local")
  const [seasonality, setSeasonality] = useState("auto")

  const plan = String(profile?.["custom:plan"] || "free").toLowerCase()
  const allowGlobal = plan === "professional"

  const availableModels = useMemo(() => {
    if (plan === "professional") {
      return ["arima", "ets", "ses", "theta", "tbats", "dhr_arima", "naive", "snaive", "croston", "pooled_regression"]
    }
    if (plan === "core") {
      return ["arima", "ets", "ses", "theta", "tbats", "dhr_arima", "naive", "snaive", "croston"]
    }
    return ["arima"]
  }, [plan])

  const activeSource = useMemo(
    () => sources.find((source) => source.provider === provider) || null,
    [sources, provider]
  )
  const activeAdapter = activeSource?.id ? adaptersBySourceId[activeSource.id] || null : null

  const connectionState: ConnectorState = activeSource?.state || "not_connected"
  const connectedAccount = activeSource?.accountName || ""
  const connectedAt = activeSource?.connectedAt || null
  const availableObjects = providerCatalog[provider]?.objects || []
  const defaultSelectedObjects = providerCatalog[provider]?.defaultSelected || []

  const loadConnectorState = async () => {
    const res = await fetch("/api/data-sources", { cache: "no-store" })
    if (!res.ok) throw new Error(await readError(res))
    const payload = (await res.json()) as {
      currentUserRole?: string
      canManageSources?: boolean
      items?: DataSourceItem[]
      audit?: DataSourceAuditEvent[]
      adapters?: AdapterMap
    }
    setSources(Array.isArray(payload.items) ? payload.items : [])
    setAuditEvents(Array.isArray(payload.audit) ? payload.audit : [])
    setCanManageSources(payload.canManageSources !== false)
    setAdaptersBySourceId(payload.adapters && typeof payload.adapters === "object" ? payload.adapters : {})
  }

  const loadAdapterTemplates = async () => {
    const res = await fetch("/api/data-sources/adapters/templates", { cache: "no-store" })
    if (!res.ok) throw new Error(await readError(res))
    const payload = (await res.json()) as { items?: AdapterTemplate[] }
    setAdapterTemplates(Array.isArray(payload.items) ? payload.items : [])
  }

  const loadProviderCatalog = async () => {
    const res = await fetch("/api/data-sources/catalog", { cache: "no-store" })
    if (!res.ok) throw new Error(await readError(res))
    const payload = (await res.json()) as { providers?: ProviderCatalog }
    setProviderCatalog(payload.providers && typeof payload.providers === "object" ? payload.providers : {})
  }

  const loadHealth = async () => {
    const res = await fetch("/api/data-sources/health", { cache: "no-store" })
    if (!res.ok) throw new Error(await readError(res))
    const payload = (await res.json()) as {
      summary?: HealthSummary
      providers?: HealthProviderRow[]
    }
    setHealthSummary(payload.summary || null)
    setHealthProviders(Array.isArray(payload.providers) ? payload.providers : [])
  }

  useEffect(() => {
    if (!availableModels.includes(model)) setModel(availableModels[0])
    if (!allowGlobal && mode === "global") setMode("local")
  }, [availableModels, model, allowGlobal, mode])

  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const [settingsRes] = await Promise.all([
          fetch("/api/tenant-settings"),
          loadConnectorState(),
          loadAdapterTemplates(),
          loadProviderCatalog(),
        ])
        await loadHealth()
        if (settingsRes.ok) {
          const data = await settingsRes.json()
          if (data?.model) setModel(String(data.model))
          if (data?.mode) setMode(String(data.mode))
          if (data?.seasonality) setSeasonality(String(data.seasonality))
        }
      } catch (error) {
        setPageError(error instanceof Error ? error.message : "failed_to_load_data_input")
      }
    }
    void loadDefaults()
  }, [])

  useEffect(() => {
    const providers: ConnectorProvider[] = ["shopify", "quickbooks", "bigcommerce", "amazon"]
    for (const key of providers) {
      const status = searchParams.get(key)
      if (!status) continue
      const label = key === "bigcommerce" ? "BigCommerce" : key.charAt(0).toUpperCase() + key.slice(1)
      if (status === "connected") {
        setImportSummary({ status: "success", message: `${label} connected successfully.` })
        void loadConnectorState()
        void loadHealth()
        void loadProviderCatalog()
        return
      }
      setImportSummary({ status: "error", message: `${label} connection failed: ${status}` })
      return
    }
  }, [searchParams])

  useEffect(() => {
    if (activeSource) {
      setSelectedTables(activeSource.selectedTables || [])
      setSyncMode(activeSource.syncMode || "manual")
      setSyncStartDate(activeSource.syncStartDate || "")
      return
    }
    setSelectedTables([])
    setSyncMode("manual")
    setSyncStartDate("")
  }, [activeSource])

  const processSelectedFile = (file: File) => {
    setUploadedFile(file)
    setIsProcessing(true)
    let progress = 0
    const interval = setInterval(() => {
      progress += 10
      setUploadProgress(progress)
      if (progress >= 100) {
        clearInterval(interval)
        setIsProcessing(false)
      }
    }, 200)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) processSelectedFile(file)
  }

  const handleFileDrop = (file: File) => processSelectedFile(file)

  const handleConnect = async ({
    accountName,
    accountId,
    selectedTables: selectedObjects,
  }: {
    accountName: string
    accountId: string
    selectedTables: string[]
  }) => {
    if (!canManageSources) return
    const tablesQuery = encodeURIComponent(selectedObjects.join(","))
    if (provider === "shopify") {
      const shop = accountName.trim().toLowerCase()
      window.location.assign(`/api/data-sources/shopify/start?shop=${encodeURIComponent(shop)}&tables=${tablesQuery}`)
      return
    }
    if (provider === "quickbooks") {
      window.location.assign(`/api/data-sources/quickbooks/start?tables=${tablesQuery}`)
      return
    }
    if (provider === "bigcommerce") {
      window.location.assign(`/api/data-sources/bigcommerce/start?tables=${tablesQuery}`)
      return
    }
    if (provider === "amazon") {
      window.location.assign(`/api/data-sources/amazon/start?tables=${tablesQuery}`)
      return
    }
    setImportSummary({ status: "running", message: "Connecting source..." })
    try {
      const res = await fetch("/api/data-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, accountName, accountId, selectedTables: selectedObjects }),
      })
      if (!res.ok) throw new Error(await readError(res))
      await loadConnectorState()
      await loadHealth()
      await loadProviderCatalog()
      setImportSummary({ status: "success", message: `${accountName} connected successfully.` })
    } catch (error) {
      setImportSummary({
        status: "error",
        message: error instanceof Error ? error.message : "failed_to_connect_source",
      })
    }
  }

  const handleDisconnect = async () => {
    if (!activeSource?.id || !canManageSources) return
    setImportSummary({ status: "running", message: "Disconnecting source..." })
    try {
      const res = await fetch(`/api/data-sources/${encodeURIComponent(activeSource.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: "not_connected", selectedTables: [] }),
      })
      if (!res.ok) throw new Error(await readError(res))
      await loadConnectorState()
      await loadHealth()
      await loadProviderCatalog()
      setImportSummary({ status: "success", message: "Source disconnected." })
    } catch (error) {
      setImportSummary({
        status: "error",
        message: error instanceof Error ? error.message : "failed_to_disconnect_source",
      })
    }
  }

  const saveSourceConfiguration = async () => {
    if (!activeSource?.id || !canManageSources) return
    setImportSummary({ status: "running", message: "Saving source configuration..." })
    try {
      const res = await fetch(`/api/data-sources/${encodeURIComponent(activeSource.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedTables,
          syncMode,
          syncStartDate,
          adapter: provider === "other" ? activeAdapter : undefined,
        }),
      })
      if (!res.ok) throw new Error(await readError(res))
      await loadConnectorState()
      await loadHealth()
      setImportSummary({ status: "success", message: "Source configuration saved." })
    } catch (error) {
      setImportSummary({
        status: "error",
        message: error instanceof Error ? error.message : "failed_to_save_source_configuration",
      })
    }
  }

  const runImportNow = async () => {
    if (!activeSource?.id) return
    if (selectedTables.length === 0) {
      setImportSummary({ status: "error", message: "Choose at least one table/object before importing." })
      return
    }

    setImportSummary({ status: "running", message: "Import in progress..." })
    try {
      const saveRes = await fetch(`/api/data-sources/${encodeURIComponent(activeSource.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedTables, syncMode, syncStartDate }),
      })
      if (!saveRes.ok) throw new Error(await readError(saveRes))

      const res = await fetch(`/api/data-sources/${encodeURIComponent(activeSource.id)}/sync`, { method: "POST" })
      if (!res.ok) throw new Error(await readError(res))
      const payload = (await res.json()) as { run?: { message?: string } }

      await loadConnectorState()
      await loadHealth()
      setImportSummary({
        status: "success",
        message: payload?.run?.message || `Imported ${selectedTables.length} table(s).`,
      })
    } catch (error) {
      setImportSummary({
        status: "error",
        message: error instanceof Error ? error.message : "failed_to_run_import",
      })
    }
  }

  const runDueImports = async () => {
    if (!canManageSources) return
    setImportSummary({ status: "running", message: "Running due imports..." })
    try {
      const res = await fetch("/api/data-sources/sync-due", { method: "POST" })
      if (!res.ok) throw new Error(await readError(res))
      const payload = (await res.json()) as { processed?: number; success?: number; failed?: number }
      await loadConnectorState()
      await loadHealth()
      setImportSummary({
        status: payload.failed && payload.failed > 0 ? "error" : "success",
        message: `Processed ${payload.processed ?? 0} due source(s): ${payload.success ?? 0} succeeded, ${payload.failed ?? 0} failed.`,
      })
    } catch (error) {
      setImportSummary({
        status: "error",
        message: error instanceof Error ? error.message : "failed_to_run_due_imports",
      })
    }
  }

  const startForecasting = async () => {
    if (!uploadedFile) return
    setIsProcessing(true)
    setRunStatus(null)

    try {
      const uploadRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: uploadedFile.name,
          contentType: uploadedFile.type || "text/csv",
        }),
      })

      if (!uploadRes.ok) {
        setRunStatus({ message: "Failed to get upload URL" })
        setIsProcessing(false)
        return
      }

      const { uploadUrl, s3Key, s3Bucket } = await uploadRes.json()

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": uploadedFile.type || "text/csv" },
        body: uploadedFile,
      })

      if (!putRes.ok) {
        setRunStatus({ message: "Upload failed" })
        setIsProcessing(false)
        return
      }

      setUploadProgress(100)

      const runRes = await fetch("/api/forecast/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          s3Bucket,
          s3Key,
          originalFilename: uploadedFile.name,
          model,
          mode,
          seasonality,
        }),
      })

      const runJson = await runRes.json()
      if (!runRes.ok || runJson?.status === "error") {
        setRunStatus({ message: "Failed to start forecast run" })
        setIsProcessing(false)
        return
      }

      await fetch("/api/tenant-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, mode, seasonality }),
      })

      setRunStatus({
        runId: runJson?.run?.runId,
        status: runJson?.run?.status || runJson?.status,
        createdAt: runJson?.run?.createdAt,
        updatedAt: runJson?.run?.updatedAt,
        message: runJson?.message,
      })
    } catch {
      setRunStatus({ message: "Unexpected error starting forecast" })
    } finally {
      setIsProcessing(false)
    }
  }

  const formattedRunTime = useMemo(() => {
    if (!runStatus?.createdAt) return null
    const date = new Date(runStatus.createdAt)
    if (Number.isNaN(date.getTime())) return null
    return `${date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
  }, [runStatus?.createdAt])

  const statusLabel = (runStatus?.status || "").toUpperCase()
  const statusTone =
    statusLabel === "DONE"
      ? "bg-green-100 text-green-800"
      : statusLabel === "FAILED"
        ? "bg-red-100 text-red-800"
        : statusLabel === "RUNNING"
          ? "bg-blue-100 text-blue-800"
          : statusLabel
            ? "bg-yellow-100 text-yellow-800"
            : "bg-gray-100 text-gray-800"

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-foreground">Data Input</h1>
          <p className="text-muted-foreground">Upload and configure your forecasting data sources</p>
        </div>

        {pageError && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {pageError}
          </div>
        )}

        <DataSourceSelection
          availableObjects={availableObjects}
          defaultSelectedObjects={defaultSelectedObjects}
          provider={provider}
          setProvider={setProvider}
          connectionState={connectionState}
          connectedAccount={connectedAccount}
          connectedAt={connectedAt}
          canManageSources={canManageSources}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <FileUploadSection
              handleFileUpload={handleFileUpload}
              handleFileDrop={handleFileDrop}
              uploadedFile={uploadedFile}
              isProcessing={isProcessing}
              uploadProgress={uploadProgress}
            />
            {healthSummary && (
              <div className="rounded-lg border p-4 text-sm">
                <div className="font-medium">Source Ops Health</div>
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
                  <div className="rounded-md bg-muted/40 p-2">
                    <div className="text-xs text-muted-foreground">Connected</div>
                    <div className="text-base font-semibold">{healthSummary.connected}</div>
                  </div>
                  <div className="rounded-md bg-muted/40 p-2">
                    <div className="text-xs text-muted-foreground">Errored</div>
                    <div className="text-base font-semibold text-red-700">{healthSummary.errored}</div>
                  </div>
                  <div className="rounded-md bg-muted/40 p-2">
                    <div className="text-xs text-muted-foreground">Stale &gt; 24h</div>
                    <div className="text-base font-semibold">{healthSummary.stale}</div>
                  </div>
                  <div className="rounded-md bg-muted/40 p-2">
                    <div className="text-xs text-muted-foreground">Retries</div>
                    <div className="text-base font-semibold">{healthSummary.totalRetries}</div>
                  </div>
                  <div className="rounded-md bg-muted/40 p-2">
                    <div className="text-xs text-muted-foreground">Error rate 24h</div>
                    <div className="text-base font-semibold">{healthSummary.errorRate24h}%</div>
                  </div>
                </div>
                {healthProviders.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {healthProviders.slice(0, 6).map((row) => (
                      <div key={row.sourceId} className="rounded-md bg-muted/30 p-2">
                        <div className="text-sm">
                          <span className="font-medium">{row.provider}</span> • {row.state} • {row.syncMode}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Retries: {row.retryCount} • Last import: {row.lastImportAt ? new Date(row.lastImportAt).toLocaleString() : "N/A"}
                        </div>
                        {row.lastError && <div className="text-xs text-red-700">{row.lastError}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DataConfiguration
            plan={plan}
            model={model}
            setModel={setModel}
            mode={mode}
            setMode={setMode}
            seasonality={seasonality}
            setSeasonality={setSeasonality}
            availableModels={availableModels}
            allowGlobal={allowGlobal}
            provider={provider}
            connectionState={connectionState}
            availableTables={availableObjects}
            selectedTables={selectedTables}
            setSelectedTables={setSelectedTables}
            syncMode={syncMode}
            setSyncMode={setSyncMode}
            syncStartDate={syncStartDate}
            setSyncStartDate={setSyncStartDate}
            lastImportAt={activeSource?.lastImportAt || null}
            nextImportAt={activeSource?.nextImportAt || null}
            retryCount={activeSource?.retryCount || 0}
            lastError={activeSource?.lastError || null}
            canManageSources={canManageSources}
            adapterTemplates={adapterTemplates}
            adapterConfig={activeAdapter}
            setAdapterConfig={(next) => {
              if (!activeSource?.id) return
              setAdaptersBySourceId((prev) => {
                const value = typeof next === "function" ? next(prev[activeSource.id] || null) : next
                return {
                  ...prev,
                  [activeSource.id]: value || {
                    templateId: "csv-basic",
                    kind: "csv",
                    fileDelimiter: ",",
                    authType: "none",
                    columnMapping: {},
                    updatedAt: new Date().toISOString(),
                  },
                }
              })
            }}
          />
        </div>

        <DataQualityIndicator uploadedFile={uploadedFile} isProcessing={isProcessing} />
        <div className="mt-8 flex justify-end gap-4">
          <Button variant="outline" onClick={runDueImports} disabled={!canManageSources || importSummary.status === "running"}>
            Run Due Imports
          </Button>
          <Button variant="outline" onClick={saveSourceConfiguration} disabled={!activeSource || !canManageSources || importSummary.status === "running"}>
            Save Configuration
          </Button>
          <Button
            variant="outline"
            disabled={!activeSource || connectionState !== "connected" || importSummary.status === "running" || !canManageSources}
            onClick={runImportNow}
          >
            {importSummary.status === "running" ? "Importing..." : "Run Import Now"}
          </Button>
          <Button disabled={!uploadedFile || isProcessing} className="min-w-32" onClick={startForecasting}>
            {isProcessing ? "Processing..." : "Start Forecasting"}
          </Button>
        </div>

        {importSummary.status !== "idle" && (
          <div className="mt-4 rounded-lg border p-4 text-sm">
            <div className="font-medium">Connected Source Import</div>
            <div className="mt-1 text-muted-foreground">{importSummary.message}</div>
          </div>
        )}

        {auditEvents.length > 0 && (
          <div className="mt-4 rounded-lg border p-4 text-sm">
            <div className="font-medium">Recent Source Activity</div>
            <div className="mt-2 space-y-2">
              {auditEvents.slice(0, 6).map((event) => (
                <div key={event.id} className="rounded-md bg-muted/40 p-2">
                  <div className="text-sm">{event.message}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(event.createdAt).toLocaleString()} • {event.actorType === "system" ? "System" : event.actor}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {runStatus && (
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-900">Forecast run submitted</div>
                {runStatus.runId && <div className="text-xs text-muted-foreground">Run ID: {runStatus.runId}</div>}
                {formattedRunTime && <div className="text-xs text-muted-foreground">{formattedRunTime}</div>}
                {runStatus.message && <div className="text-xs text-muted-foreground">{runStatus.message}</div>}
              </div>
              <div className="flex items-center gap-3">
                {statusLabel && (
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone}`}>{statusLabel.toLowerCase()}</span>
                )}
                <Button asChild size="sm" variant="outline" className="bg-transparent">
                  <Link href="/notifications">Check the latest run status</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
