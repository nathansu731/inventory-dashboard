import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useProfile } from "@/hooks/use-profile"
import type { AdapterTemplate, DataSourceAdapterConfig } from "@/lib/data-source-adapters"
import type { ConnectorProvider, ConnectorState } from "@/components/data-input-page/data-source-selection"
import { useRunStatusStream, type StreamRunSummary } from "@/components/data-input-page/use-run-status-stream"
import type { HealthProviderRow, HealthSummary } from "@/components/data-input-page/source-ops-health-section"

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
  availableTables: string[]
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

type ProviderCatalogEntry = {
  objects: string[]
  defaultSelected: string[]
}

type ProviderCatalog = Partial<Record<ConnectorProvider, ProviderCatalogEntry>>

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

const readError = async (res: Response) => {
  try {
    const payload = (await res.json()) as { error?: string }
    return payload.error || `request_failed_${res.status}`
  } catch {
    return `request_failed_${res.status}`
  }
}

export const useDataInputController = () => {
  const searchParams = useSearchParams()
  const { profile } = useProfile()

  const [provider, setProvider] = useState<ConnectorProvider>("csv")
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

  const [importSummary, setImportSummary] = useState<ImportSummary>({ status: "idle", message: "" })

  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [runStatus, setRunStatus] = useState<StreamRunSummary | null>(null)
  const [latestRunId, setLatestRunId] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [isSavingForecastDefaults, setIsSavingForecastDefaults] = useState(false)
  const [forecastDefaultsMessage, setForecastDefaultsMessage] = useState<string | null>(null)
  const [forecastDefaultsIsError, setForecastDefaultsIsError] = useState(false)

  const [model, setModel] = useState("arima")
  const [mode, setMode] = useState("local")
  const [seasonality, setSeasonality] = useState("auto")
  const [dateFormat, setDateFormat] = useState("dd/mm/yyyy")
  const [targetVariable, setTargetVariable] = useState("quantity")
  const [priceColumnName, setPriceColumnName] = useState("price")

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

  const activeSource = useMemo(() => sources.find((source) => source.provider === provider) || null, [sources, provider])
  const activeAdapter = activeSource?.id ? adaptersBySourceId[activeSource.id] || null : null
  const connectionState: ConnectorState = activeSource?.state || "not_connected"
  const connectedAccount = activeSource?.accountName || ""
  const connectedAt = activeSource?.connectedAt || null
  const availableObjects = useMemo(() => {
    const catalogObjects = providerCatalog[provider]?.objects || []
    const savedObjects = activeSource?.availableTables || []
    return Array.from(new Set([...savedObjects, ...catalogObjects]))
  }, [activeSource?.availableTables, provider, providerCatalog])
  const defaultSelectedObjects = providerCatalog[provider]?.defaultSelected || []

  const loadConnectorState = async () => {
    const res = await fetch("/api/data-sources", { cache: "no-store" })
    if (!res.ok) throw new Error(await readError(res))
    const payload = (await res.json()) as {
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
    const payload = (await res.json()) as { summary?: HealthSummary; providers?: HealthProviderRow[] }
    setHealthSummary(payload.summary || null)
    setHealthProviders(Array.isArray(payload.providers) ? payload.providers : [])
  }

  const loadLatestRun = async () => {
    const res = await fetch("/api/list-forecast-runs?limit=1", { cache: "no-store" })
    if (!res.ok) return
    const payload = (await res.json()) as { items?: Array<{ runId?: string }> }
    setLatestRunId(payload?.items?.[0]?.runId || null)
  }

  useEffect(() => {
    if (!availableModels.includes(model)) setModel(availableModels[0])
    if (!allowGlobal && mode === "global") setMode("local")
  }, [allowGlobal, availableModels, model, mode])

  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const [settingsRes] = await Promise.all([
          fetch("/api/tenant-settings"),
          loadConnectorState(),
          loadAdapterTemplates(),
          loadProviderCatalog(),
          loadLatestRun(),
        ])
        await loadHealth()
        if (settingsRes.ok) {
          const data = await settingsRes.json()
          if (data?.model) setModel(String(data.model))
          if (data?.mode) setMode(String(data.mode))
          if (data?.seasonality) setSeasonality(String(data.seasonality))
          if (data?.dateFormat) setDateFormat(String(data.dateFormat))
          if (data?.targetVariable) setTargetVariable(String(data.targetVariable))
          if (data?.priceColumnName) setPriceColumnName(String(data.priceColumnName))
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
      return
    }
    setSelectedTables([])
    setSyncMode("manual")
  }, [activeSource])

  useRunStatusStream(runStatus?.runId, setRunStatus)

  const processSelectedFile = (file: File) => {
    const lowerName = file.name.toLowerCase()
    if (!lowerName.endsWith(".csv")) {
      setPageError("invalid_file_type: only .csv files are supported")
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setPageError("file_too_large: max allowed size is 10MB")
      return
    }
    setPageError(null)
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
    availableTables,
    selectedTables: selectedObjects,
  }: {
    accountName: string
    accountId: string
    availableTables: string[]
    selectedTables: string[]
  }) => {
    if (!canManageSources) return
    if (provider === "csv") {
      setImportSummary({ status: "success", message: "CSV upload mode selected. No external source connection required." })
      return
    }
    const tablesQuery = encodeURIComponent(selectedObjects.join(","))
    const allTablesQuery = encodeURIComponent(availableTables.join(","))
    if (provider === "shopify") {
      const shop = accountName.trim().toLowerCase()
      window.location.assign(`/api/data-sources/shopify/start?shop=${encodeURIComponent(shop)}&tables=${tablesQuery}&allTables=${allTablesQuery}`)
      return
    }
    if (provider === "quickbooks") {
      window.location.assign(`/api/data-sources/quickbooks/start?tables=${tablesQuery}&allTables=${allTablesQuery}`)
      return
    }
    if (provider === "bigcommerce") {
      window.location.assign(`/api/data-sources/bigcommerce/start?tables=${tablesQuery}&allTables=${allTablesQuery}`)
      return
    }
    if (provider === "amazon") {
      window.location.assign(`/api/data-sources/amazon/start?tables=${tablesQuery}&allTables=${allTablesQuery}`)
      return
    }
    setImportSummary({ status: "running", message: "Connecting source..." })
    try {
      const res = await fetch("/api/data-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, accountName, accountId, availableTables, selectedTables: selectedObjects }),
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
          availableTables: availableObjects,
          selectedTables,
          syncMode,
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

  const saveForecastDefaults = async () => {
    if (!canManageSources || isSavingForecastDefaults) return
    setIsSavingForecastDefaults(true)
    setForecastDefaultsMessage(null)
    setForecastDefaultsIsError(false)
    try {
      const res = await fetch("/api/tenant-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, mode, seasonality, dateFormat, targetVariable, priceColumnName }),
      })
      if (!res.ok) throw new Error(await readError(res))
      setForecastDefaultsMessage("Forecast defaults saved.")
    } catch (error) {
      setForecastDefaultsIsError(true)
      setForecastDefaultsMessage(error instanceof Error ? error.message : "failed_to_save_forecast_defaults")
    } finally {
      setIsSavingForecastDefaults(false)
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
        body: JSON.stringify({ availableTables: availableObjects, selectedTables, syncMode }),
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
          fileSize: uploadedFile.size,
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
          dateFormat,
          targetVariable,
          priceColumnName,
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
        body: JSON.stringify({ model, mode, seasonality, dateFormat, targetVariable, priceColumnName }),
      })

      setRunStatus({
        runId: runJson?.run?.runId,
        status: runJson?.run?.status || runJson?.status,
        createdAt: runJson?.run?.createdAt,
        updatedAt: runJson?.run?.updatedAt,
        message: runJson?.message,
      })
      setLatestRunId(runJson?.run?.runId || null)
    } catch {
      setRunStatus({ message: "Unexpected error starting forecast" })
    } finally {
      setIsProcessing(false)
    }
  }

  const setActiveAdapter: React.Dispatch<React.SetStateAction<DataSourceAdapterConfig | null>> = (next) => {
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
  }

  return {
    provider,
    setProvider,
    availableObjects,
    defaultSelectedObjects,
    connectionState,
    connectedAccount,
    connectedAt,
    canManageSources,
    handleConnect,
    handleDisconnect,
    handleFileUpload,
    handleFileDrop,
    uploadedFile,
    isProcessing,
    uploadProgress,
    runDueImports,
    runImportNow,
    startForecasting,
    importSummary,
    activeSource,
    plan,
    model,
    setModel,
    mode,
    setMode,
    seasonality,
    setSeasonality,
    availableModels,
    allowGlobal,
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
    saveSourceConfiguration,
    saveForecastDefaults,
    isSavingForecastDefaults,
    forecastDefaultsMessage,
    forecastDefaultsIsError,
    adapterTemplates,
    activeAdapter,
    setActiveAdapter,
    healthSummary,
    healthProviders,
    auditEvents,
    runStatus,
    latestRunId,
    pageError,
  }
}
