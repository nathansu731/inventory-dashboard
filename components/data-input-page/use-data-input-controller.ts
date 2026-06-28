import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useProfile } from "@/hooks/use-profile"
import type { AdapterTemplate, DataSourceAdapterConfig } from "@/lib/data-source-adapters"
import type { ConnectorProvider, ConnectorState } from "@/components/data-input-page/data-source-selection"
import { useRunStatusStream, type StreamRunSummary } from "@/components/data-input-page/use-run-status-stream"
import type { HealthProviderRow, HealthSummary } from "@/components/data-input-page/source-ops-health-section"
import type { DataSourceDiagnostics, DataSourceImportArtifact } from "@/lib/data-sources"
import {
  defaultProviderSetupConfig,
  type ProviderBlueprint,
  type ProviderSetupConfig,
} from "@/lib/provider-source-config"
import {
  buildRestrictionErrorPayload,
  getPlanFileGuardrailLimits,
  HELP_CENTER_HREF,
  MAX_CELL_CHARACTERS,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_COLUMNS,
  normalizeTenantPlan,
  type RestrictionErrorPayload,
} from "@/lib/upload-guardrails"

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
  sourceConfig?: ProviderSetupConfig
  diagnostics?: DataSourceDiagnostics
  latestImport?: DataSourceImportArtifact
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
type ProviderBlueprintCatalog = Partial<Record<ConnectorProvider, ProviderBlueprint>>

type ParsedCsvRecord = Record<string, string>

type InventorySnapshotStatus = {
  hasSnapshot: boolean
  metadata: {
    uploadedAt?: string | null
    rowCount?: number
    asOfDate?: string | null
    sourceType?: string | null
  } | null
  rowCount: number
}

type InventorySnapshotRow = {
  sku: string
  store: string
  onHand: number
  asOfDate?: string | null
}

type FutureDateRange = {
  startDate: string
  endDate: string
}

type PageErrorDetails = RestrictionErrorPayload & {
  title: string
}

export type ForecastFutureAssumptions = {
  storeState: string
  closedWeekdays: number[]
  holidayRanges: FutureDateRange[]
  promotionRanges: FutureDateRange[]
}

export type ForecastClosedWeekdaySuggestion = {
  weekday: number
  label: string
  sampleCount: number
  averageSales: number
  lowSalesShare: number
  closedShare: number
  reason: string
}

export type ForecastRunAssumptionsPrompt = {
  forecastWindowStart: string | null
  forecastWindowEnd: string | null
  detectedClosedWeekdays: ForecastClosedWeekdaySuggestion[]
  askHolidayRanges: boolean
  askPromotionRanges: boolean
  askStoreState: boolean
  stateCandidates: string[]
}

export type LocalSeriesEstimate = {
  count: number
  skuColumn: string | null
  storeColumn: string | null
}

export type TargetColumnValidationSummary = {
  targetColumn: string | null
  totalRows: number
  validRows: number
  invalidRowCount: number
  exampleInvalidRows: Array<{
    rowNumber: number
    rawValue: string
    sku: string | null
    store: string | null
    reason: string
  }>
}

const WEEKDAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const

const normalizeColumnKey = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "")

const parseCsvLine = (line: string) => {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim())
      current = ""
      continue
    }
    current += char
  }

  values.push(current.trim())
  return values
}

const parseCsvHeaderLine = (line: string) => parseCsvLine(line).filter((value) => value.length > 0)

const parseCsvRecords = (raw: string) => {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) {
    return { headers: [] as string[], records: [] as ParsedCsvRecord[] }
  }

  const headers = parseCsvHeaderLine(lines[0])
  const records = lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    return headers.reduce<ParsedCsvRecord>((acc, header, index) => {
      acc[header] = values[index]?.trim() ?? ""
      return acc
    }, {})
  })

  return { headers, records }
}

const hasUnsafeControlCharacters = (raw: string) => /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(raw)

const titleForPageError = (code?: string) => {
  if (code?.includes("RATE_LIMITED")) return "Please wait before retrying"
  if (code?.includes("TOO_LARGE")) return "File too large"
  if (code?.includes("UNSAFE") || code?.includes("NOT_ALLOWED")) return "Upload blocked"
  return "Data upload issue"
}

const buildPageErrorDetails = ({
  code,
  message,
  details,
  retryAfterSeconds,
}: {
  code?: string
  message: string
  details?: Record<string, unknown>
  retryAfterSeconds?: number
}): PageErrorDetails => ({
  ...buildRestrictionErrorPayload({
    code: code || "UPLOAD_KEY_NOT_ALLOWED",
    error: message,
    details,
    retryAfterSeconds,
  }),
  title: titleForPageError(code),
})

const validateCsvStructure = (raw: string, plan: "launch" | "professional" | "enterprise") => {
  const limits = getPlanFileGuardrailLimits(plan)
  if (!raw.trim()) {
    return { ok: false as const, code: "EMPTY_UPLOAD", message: "The uploaded CSV is empty." }
  }
  if (hasUnsafeControlCharacters(raw)) {
    return { ok: false as const, code: "UNSAFE_CONTROL_CHARACTERS", message: "The uploaded file contains unsupported control characters or binary content." }
  }

  const { headers, records } = parseCsvRecords(raw)
  if (headers.length === 0 || records.length === 0) {
    return { ok: false as const, code: "CSV_HEADERS_OR_ROWS_MISSING", message: "The uploaded CSV must include a header row and at least one data row." }
  }
  if (headers.length > MAX_UPLOAD_COLUMNS) {
    return { ok: false as const, code: "UPLOAD_COLUMNS_LIMIT_EXCEEDED", message: `The uploaded CSV has ${headers.length} columns. Limit uploads to ${MAX_UPLOAD_COLUMNS} columns or fewer.` }
  }
  if (records.length > limits.maxRows) {
    return {
      ok: false as const,
      code: "UPLOAD_ROWS_LIMIT_EXCEEDED",
      message: `This ${plan} plan supports up to ${limits.maxRows.toLocaleString("en-US")} rows per upload. Reduce the file and try again.`,
    }
  }
  if (headers.some((header) => header.length > 120)) {
    return { ok: false as const, code: "UPLOAD_HEADER_LENGTH_EXCEEDED", message: "One or more column headers are unusually long. Clean the file before uploading." }
  }

  for (const record of records) {
    for (const value of Object.values(record)) {
      if (String(value || "").length > MAX_CELL_CHARACTERS) {
        return {
          ok: false as const,
          code: "UPLOAD_CELL_LENGTH_EXCEEDED",
          message: `The uploaded CSV contains cell values longer than ${MAX_CELL_CHARACTERS} characters. Remove unrelated text fields before uploading.`,
        }
      }
    }
  }

  return { ok: true as const, headers, records }
}

const parseDateByFormat = (value: string, format: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null

  const normalized = normalizeColumnKey(format || "dd/mm/yyyy")
  const parts = trimmed.split(/[/-]/)
  if (normalized === "ddmmyyyy" && parts.length === 3) {
    const [day, month, year] = parts.map((part) => Number(part))
    const date = new Date(Date.UTC(year, month - 1, day))
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (normalized === "mmddyyyy" && parts.length === 3) {
    const [month, day, year] = parts.map((part) => Number(part))
    const date = new Date(Date.UTC(year, month - 1, day))
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (normalized === "yyyymmdd" && parts.length === 3) {
    const [year, month, day] = parts.map((part) => Number(part))
    const date = new Date(Date.UTC(year, month - 1, day))
    return Number.isNaN(date.getTime()) ? null : date
  }

  const fallback = new Date(trimmed)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10)

const addDaysUtc = (date: Date, days: number) => {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

const toNumberOrNull = (value: string | number | null | undefined) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const toBooleanFlag = (value: string | number | null | undefined) => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
  if (!normalized) return null
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "y"
}

const median = (values: number[]) => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

const coerceIsoDate = (value: string) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

const getSnapshotAsOfDate = (rows: InventorySnapshotRow[]) => {
  const dates = rows.map((row) => row.asOfDate).filter((value): value is string => Boolean(value)).sort()
  return dates.length > 0 ? dates[dates.length - 1] : null
}

const validateSalesCsvScope = ({
  raw,
  dateFormat,
  skuColumnName,
  storeColumnName,
  plan,
}: {
  raw: string
  dateFormat: string
  skuColumnName: string
  storeColumnName: string
  plan: "launch" | "professional" | "enterprise"
}) => {
  const structural = validateCsvStructure(raw, plan)
  if (!structural.ok) return structural

  const limits = getPlanFileGuardrailLimits(plan)
  const { headers, records } = structural
  const dateHeader = findMatchingHeader(headers, ["date"])
  if (!dateHeader) {
    return { ok: false as const, code: "DATE_COLUMN_MISSING", message: "The uploaded CSV must include a date column for forecasting history." }
  }

  const skuHeader = resolvePreferredHeader(headers, skuColumnName, ["sku", "sku_id", "skuid", "product", "productid", "product_id", "item", "itemid", "item_id"])
  const storeHeader = resolvePreferredHeader(headers, storeColumnName, ["location", "store", "storeid", "store_id", "storename", "store_name", "shop", "shopid", "shop_id", "outlet", "outletid", "outlet_id", "branch", "branchid", "branch_id"])

  let minDateMs: number | null = null
  let maxDateMs: number | null = null
  let validDateCount = 0
  const seriesCounts = new Map<string, number>()

  records.forEach((record) => {
    const parsedDate = parseDateByFormat(String(record[dateHeader] || ""), dateFormat)
    if (!parsedDate) return
    const timestamp = parsedDate.getTime()
    validDateCount += 1
    minDateMs = minDateMs === null ? timestamp : Math.min(minDateMs, timestamp)
    maxDateMs = maxDateMs === null ? timestamp : Math.max(maxDateMs, timestamp)

    const skuValue = skuHeader ? String(record[skuHeader] || "").trim() || "SKU-1" : "SKU-1"
    const storeValue = storeHeader ? String(record[storeHeader] || "").trim() || "location-1" : "location-1"
    const seriesKey = `${skuValue}::${storeValue}`
    seriesCounts.set(seriesKey, (seriesCounts.get(seriesKey) || 0) + 1)
  })

  if (validDateCount === 0 || minDateMs === null || maxDateMs === null) {
    return { ok: false as const, code: "NO_VALID_DATES", message: `No valid dates were found using the selected ${dateFormat} format.` }
  }

  const historySpanDays = Math.floor((maxDateMs - minDateMs) / (24 * 60 * 60 * 1000))
  if (historySpanDays > limits.maxHistoryDays) {
    return {
      ok: false as const,
      code: "HISTORY_WINDOW_EXCEEDED",
      message: `The uploaded history spans ${historySpanDays} days. Limit uploads to the most recent ${limits.maxHistoryDays} days for the ${plan} plan.`,
    }
  }

  if (seriesCounts.size > limits.maxSeries) {
    return {
      ok: false as const,
      code: "PLAN_SERIES_LIMIT_EXCEEDED",
      message: `This ${plan} plan supports up to ${limits.maxSeries.toLocaleString("en-US")} SKU-location series per run. Reduce the file scope and try again.`,
    }
  }

  const maxSeriesPoints = Array.from(seriesCounts.values()).reduce((max, count) => Math.max(max, count), 0)
  if (maxSeriesPoints > limits.maxSeriesPoints) {
    return {
      ok: false as const,
      code: "SERIES_POINTS_LIMIT_EXCEEDED",
      message: `At least one SKU-location series contains ${maxSeriesPoints} data points. Limit each series to ${limits.maxSeriesPoints} rows or fewer for the ${plan} plan.`,
    }
  }

  return { ok: true as const }
}

const parseInventoryRowsFromSnapshotCsv = (
  raw: string,
  uploadedHeaders: string[],
  preferredSkuColumn: string,
  preferredStoreColumn: string
) => {
  const { headers, records } = parseCsvRecords(raw)
  if (headers.length === 0 || records.length === 0) {
    return { rows: [] as InventorySnapshotRow[], error: "Inventory CSV is empty." }
  }

  const skuHeader = resolvePreferredHeader(headers, preferredSkuColumn, ["sku", "sku_id", "item", "product"])
  const storeHeader = resolvePreferredHeader(headers, preferredStoreColumn, ["store", "location", "warehouse", "shop", "branch"])
  const onHandHeader = findMatchingHeader(headers, ["on_hand", "onhand", "remaining_stock", "remainingstocks", "stock_on_hand", "inventory", "inventory_on_hand"])
  const asOfHeader = findMatchingHeader(headers, ["as_of_date", "snapshot_date", "date", "updated_at"])

  if (!skuHeader || !onHandHeader) {
    return { rows: [] as InventorySnapshotRow[], error: "Inventory CSV must include SKU and on-hand columns." }
  }

  const deduped = new Map<string, { row: InventorySnapshotRow; rank: number; rowNumber: number }>()
  records.forEach((record, index) => {
    const sku = String(record[skuHeader] || "").trim()
    const store = storeHeader ? String(record[storeHeader] || "").trim() || "Unknown" : "Unknown"
    const onHand = Number(String(record[onHandHeader] || "").trim())
    const asOfDate = asOfHeader ? coerceIsoDate(String(record[asOfHeader] || "").trim()) : null
    if (!sku || !Number.isFinite(onHand) || onHand < 0) return

    const seriesKey = `${sku}::${store}`
    const rank = asOfDate ? new Date(asOfDate).getTime() : 0
    const current = deduped.get(seriesKey)
    if (!current || rank > current.rank || (rank === current.rank && index > current.rowNumber)) {
      deduped.set(seriesKey, {
        rank,
        rowNumber: index,
        row: { sku, store, onHand, asOfDate },
      })
    }
  })

  return {
    rows: Array.from(deduped.values()).map((entry) => entry.row),
    error: Array.from(deduped.values()).length > 0 ? null : "No valid inventory rows were found in the inventory CSV.",
    matchedOnHandHeader: onHandHeader,
    matchedSkuHeader: skuHeader,
    matchedStoreHeader: storeHeader || null,
    matchedDateHeader: asOfHeader || null,
    uploadedHeaders,
  }
}

const extractInventoryRowsFromSalesCsv = ({
  raw,
  dateFormat,
  skuColumnName,
  storeColumnName,
  onHandColumnName,
}: {
  raw: string
  dateFormat: string
  skuColumnName: string
  storeColumnName: string
  onHandColumnName: string
}) => {
  const { headers, records } = parseCsvRecords(raw)
  if (headers.length === 0 || records.length === 0) return []

  const skuHeader = resolvePreferredHeader(headers, skuColumnName, ["sku", "sku_id", "item", "product"])
  const storeHeader = resolvePreferredHeader(headers, storeColumnName, ["store", "location", "warehouse", "shop", "branch"])
  const dateHeader = findMatchingHeader(headers, ["date"])
  const onHandHeader = resolvePreferredHeader(headers, onHandColumnName, [
    "on_hand",
    "onhand",
    "remaining_stock",
    "remainingstocks",
    "stock_on_hand",
    "inventory",
    "inventory_on_hand",
  ])

  if (!skuHeader || !dateHeader || !onHandHeader) return []

  const latestBySeries = new Map<string, { row: InventorySnapshotRow; rank: number; rowNumber: number }>()
  records.forEach((record, index) => {
    const sku = String(record[skuHeader] || "").trim()
    const store = storeHeader ? String(record[storeHeader] || "").trim() || "Unknown" : "Unknown"
    const onHand = Number(String(record[onHandHeader] || "").trim())
    const parsedDate = parseDateByFormat(String(record[dateHeader] || "").trim(), dateFormat)
    if (!sku || !Number.isFinite(onHand) || onHand < 0 || !parsedDate) return

    const rank = parsedDate.getTime()
    const row = {
      sku,
      store,
      onHand,
      asOfDate: toIsoDate(parsedDate),
    } satisfies InventorySnapshotRow
    const seriesKey = `${sku}::${store}`
    const current = latestBySeries.get(seriesKey)
    if (!current || rank > current.rank || (rank === current.rank && index > current.rowNumber)) {
      latestBySeries.set(seriesKey, { row, rank, rowNumber: index })
    }
  })

  return Array.from(latestBySeries.values()).map((entry) => entry.row)
}

const findMatchingHeader = (headers: string[], candidates: string[]) => {
  const headerMap = new Map(headers.map((header) => [normalizeColumnKey(header), header]))
  for (const candidate of candidates) {
    const match = headerMap.get(normalizeColumnKey(candidate))
    if (match) return match
  }
  return ""
}

const resolvePreferredHeader = (headers: string[], explicitValue: string, candidates: string[]) => {
  if (explicitValue && headers.includes(explicitValue)) return explicitValue
  return findMatchingHeader(headers, [explicitValue, ...candidates].filter(Boolean))
}

const readApiError = async (res: Response) => {
  try {
    const payload = (await res.json()) as RestrictionErrorPayload
    return {
      code: payload.code,
      details: payload.details,
      helpCenterHref: payload.helpCenterHref || HELP_CENTER_HREF,
      message: payload.error || `request_failed_${res.status}`,
      retryAfterSeconds: payload.retryAfterSeconds,
    }
  } catch {
    return {
      code: `request_failed_${res.status}`,
      details: undefined,
      helpCenterHref: HELP_CENTER_HREF,
      message: `request_failed_${res.status}`,
      retryAfterSeconds: undefined,
    }
  }
}

const providerStatusMessage = (provider: ConnectorProvider, status: string) => {
  const label = provider === "bigcommerce" ? "BigCommerce" : provider.charAt(0).toUpperCase() + provider.slice(1)
  if (status === "missing_shop_parameter") return `${label} connection requires a store domain before redirecting.`
  if (status === "missing_code") return `${label} did not return an authorization code. The provider consent flow was not completed.`
  if (status === "missing_realm") return `${label} connected, but company access was not granted. Reconnect and choose a QuickBooks company.`
  if (status === "missing_context") return `${label} connected, but store context was not returned. Reinstall the app and try again.`
  if (status === "missing_credentials") return `${label} connected, but the app is missing required client credentials on the server.`
  if (status === "missing_spapi_config") return `${label} consent succeeded, but SP-API AWS signing credentials are not configured.`
  if (status === "csrf_mismatch") return `${label} rejected the callback because the security state token did not match. Restart the connection flow.`
  if (status === "token_exchange_failed") return `${label} authorization succeeded, but token exchange failed. Check app credentials and granted scopes.`
  if (status === "connected") return `${label} connected successfully.`
  return `${label} connection failed: ${status.replaceAll("_", " ")}.`
}

const connectorProviderToSourceProvider = (provider: ConnectorProvider) => (provider === "csv" ? "other" : provider)

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
  const [providerBlueprints, setProviderBlueprints] = useState<ProviderBlueprintCatalog>({})

  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [syncMode, setSyncMode] = useState("manual")
  const [sourceConfig, setSourceConfig] = useState<ProviderSetupConfig>(defaultProviderSetupConfig("other"))

  const [importSummary, setImportSummary] = useState<ImportSummary>({ status: "idle", message: "" })

  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedColumns, setUploadedColumns] = useState<string[]>([])
  const [uploadedFileText, setUploadedFileText] = useState("")
  const [inventoryFile, setInventoryFile] = useState<File | null>(null)
  const [inventoryStatus, setInventoryStatus] = useState<InventorySnapshotStatus | null>(null)
  const [inventoryActionMessage, setInventoryActionMessage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [runStatus, setRunStatus] = useState<StreamRunSummary | null>(null)
  const [latestRunId, setLatestRunId] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [pageErrorDetails, setPageErrorDetails] = useState<PageErrorDetails | null>(null)
  const [isSavingForecastDefaults, setIsSavingForecastDefaults] = useState(false)
  const [forecastDefaultsMessage, setForecastDefaultsMessage] = useState<string | null>(null)
  const [forecastDefaultsIsError, setForecastDefaultsIsError] = useState(false)

  const [model, setModel] = useState("xgboost")
  const [mode, setMode] = useState("global")
  const [seasonality, setSeasonality] = useState("auto")
  const [dateFormat, setDateFormat] = useState("dd/mm/yyyy")
  const [skuColumnName, setSkuColumnName] = useState("")
  const [storeColumnName, setStoreColumnName] = useState("")
  const [targetVariable, setTargetVariable] = useState("quantity")
  const [onHandColumnName, setOnHandColumnName] = useState("")
  const [priceColumnName, setPriceColumnName] = useState("price")
  const [holidayColumnName, setHolidayColumnName] = useState("")
  const [promotionColumnName, setPromotionColumnName] = useState("")
  const [openStatusColumnName, setOpenStatusColumnName] = useState("")
  const [forecastHorizon, setForecastHorizon] = useState("30")

  const rawPlan = String(profile?.["custom:plan"] || "launch").toLowerCase()
  const plan = (() => {
    if (rawPlan === "enterprise") return "enterprise"
    if (rawPlan === "professional" || rawPlan === "core" || rawPlan === "pro") return "professional"
    if (rawPlan === "launch" || rawPlan === "free") return "launch"
    return "launch"
  })()
  const normalizedPlan = normalizeTenantPlan(plan)
  const availableLocalModels = useMemo(() => {
    if (plan === "enterprise") {
      return ["arima", "regression_arima", "ets", "ses", "theta", "tbats", "dhr_arima", "naive", "snaive", "croston"]
    }
    if (plan === "professional") {
      return ["arima", "regression_arima", "ets", "ses", "theta", "tbats", "dhr_arima", "naive", "snaive", "croston"]
    }
    return ["arima", "regression_arima"]
  }, [plan])

  const availableGlobalModels = useMemo(() => {
    if (plan === "enterprise") {
      return ["xgboost", "pooled_regression"]
    }
    return ["xgboost"]
  }, [plan])

  const allowGlobal = availableGlobalModels.length > 0

  const availableModels = useMemo(() => {
    return mode === "global" ? availableGlobalModels : availableLocalModels
  }, [availableGlobalModels, availableLocalModels, mode])

  const activeSource = useMemo(() => sources.find((source) => source.provider === provider) || null, [sources, provider])
  const activeAdapter = activeSource?.id ? adaptersBySourceId[activeSource.id] || null : null
  const connectionState: ConnectorState = activeSource?.state || "not_connected"
  const connectedAccount = activeSource?.accountName || ""
  const connectedAt = activeSource?.connectedAt || null
  const activeDiagnostics = activeSource?.diagnostics || null
  const activeBlueprint = providerBlueprints[provider] || null
  const availableObjects = useMemo(() => {
    const catalogObjects = providerCatalog[provider]?.objects || []
    const savedObjects = activeSource?.availableTables || []
    return Array.from(new Set([...savedObjects, ...catalogObjects]))
  }, [activeSource?.availableTables, provider, providerCatalog])
  const defaultSelectedObjects = providerCatalog[provider]?.defaultSelected || []
  const effectiveSelectedTables = useMemo(
    () =>
      Array.from(
        new Set(
          [...selectedTables, sourceConfig.salesEntity, sourceConfig.catalogEntity, sourceConfig.inventoryEntity]
            .map((item) => item.trim())
            .filter(Boolean)
        )
      ),
    [selectedTables, sourceConfig.catalogEntity, sourceConfig.inventoryEntity, sourceConfig.salesEntity]
  )

  const loadConnectorState = async () => {
    const res = await fetch("/api/data-sources", { cache: "no-store" })
    if (!res.ok) throw new Error((await readApiError(res)).message)
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
    if (!res.ok) throw new Error((await readApiError(res)).message)
    const payload = (await res.json()) as { items?: AdapterTemplate[] }
    setAdapterTemplates(Array.isArray(payload.items) ? payload.items : [])
  }

  const loadProviderCatalog = async () => {
    const res = await fetch("/api/data-sources/catalog", { cache: "no-store" })
    if (!res.ok) throw new Error((await readApiError(res)).message)
    const payload = (await res.json()) as { providers?: ProviderCatalog; blueprints?: ProviderBlueprintCatalog }
    setProviderCatalog(payload.providers && typeof payload.providers === "object" ? payload.providers : {})
    setProviderBlueprints(payload.blueprints && typeof payload.blueprints === "object" ? payload.blueprints : {})
  }

  const loadHealth = async () => {
    const res = await fetch("/api/data-sources/health", { cache: "no-store" })
    if (!res.ok) throw new Error((await readApiError(res)).message)
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

  const loadInventoryStatus = async () => {
    const res = await fetch("/api/inventory-snapshot", { cache: "no-store" })
    if (!res.ok) throw new Error((await readApiError(res)).message)
    const payload = (await res.json()) as InventorySnapshotStatus
    setInventoryStatus(payload)
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
          loadInventoryStatus(),
        ])
        await loadHealth()
        if (settingsRes.ok) {
          const data = await settingsRes.json()
          if (data?.model) setModel(String(data.model))
          if (data?.mode) setMode(String(data.mode))
          if (data?.seasonality) setSeasonality(String(data.seasonality))
          if (data?.dateFormat) setDateFormat(String(data.dateFormat))
          if (Object.prototype.hasOwnProperty.call(data || {}, "skuColumnName")) setSkuColumnName(String(data.skuColumnName || ""))
          if (Object.prototype.hasOwnProperty.call(data || {}, "storeColumnName")) setStoreColumnName(String(data.storeColumnName || ""))
          if (data?.targetVariable) setTargetVariable(String(data.targetVariable))
          if (Object.prototype.hasOwnProperty.call(data || {}, "onHandColumnName")) setOnHandColumnName(String(data.onHandColumnName || ""))
          if (data?.priceColumnName) setPriceColumnName(String(data.priceColumnName))
          if (data?.holidayColumnName) setHolidayColumnName(String(data.holidayColumnName))
          if (data?.promotionColumnName) setPromotionColumnName(String(data.promotionColumnName))
          if (data?.openStatusColumnName) setOpenStatusColumnName(String(data.openStatusColumnName))
          const parsedHorizon = Number(data?.forecastHorizon)
          if (Number.isFinite(parsedHorizon) && parsedHorizon > 0) {
            setForecastHorizon(String(Math.floor(parsedHorizon)))
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "failed_to_load_data_input"
        setPageError(message)
        setPageErrorDetails(buildPageErrorDetails({ message }))
      }
    }
    void loadDefaults()
  }, [])

  useEffect(() => {
    const providers: ConnectorProvider[] = ["shopify", "quickbooks", "bigcommerce", "amazon"]
    for (const key of providers) {
      const status = searchParams.get(key)
      if (!status) continue
      if (status === "connected") {
        setImportSummary({ status: "success", message: providerStatusMessage(key, status) })
        void loadConnectorState()
        void loadHealth()
        void loadProviderCatalog()
        return
      }
      setImportSummary({ status: "error", message: providerStatusMessage(key, status) })
      return
    }
  }, [searchParams])

  useEffect(() => {
    if (activeSource) {
      setSelectedTables(activeSource.selectedTables || [])
      setSyncMode(activeSource.syncMode || "manual")
      setSourceConfig(activeSource.sourceConfig || defaultProviderSetupConfig(connectorProviderToSourceProvider(provider)))
      return
    }
    setSelectedTables([])
    setSyncMode("manual")
    setSourceConfig(defaultProviderSetupConfig(connectorProviderToSourceProvider(provider)))
  }, [activeSource, provider])

  useRunStatusStream(runStatus?.runId, setRunStatus)

  const processSelectedFile = async (file: File) => {
    const lowerName = file.name.toLowerCase()
    if (!lowerName.endsWith(".csv")) {
      const message = "Only CSV files are supported for the main forecast upload."
      setPageError(message)
      setPageErrorDetails(buildPageErrorDetails({ code: "UPLOAD_FILE_TYPE_NOT_ALLOWED", message }))
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      const message = "The selected file is too large. Limit uploads to 10MB or less."
      setPageError(message)
      setPageErrorDetails(buildPageErrorDetails({ code: "UPLOAD_FILE_TOO_LARGE", message }))
      return
    }
    setIsProcessing(true)
    try {
      const raw = await file.text()
      const structuralValidation = validateCsvStructure(raw, normalizedPlan)
      if (!structuralValidation.ok) {
        setUploadedColumns([])
        setUploadedFileText("")
        setUploadedFile(null)
        setPageError(structuralValidation.message)
        setPageErrorDetails(buildPageErrorDetails({ code: structuralValidation.code, message: structuralValidation.message }))
        setIsProcessing(false)
        return
      }
      const headers = parseCsvHeaderLine(raw.split(/\r?\n/, 1)[0] || "")
      setUploadedColumns(headers)
      setUploadedFileText(raw)
      setPageError(null)
      setPageErrorDetails(null)
      setUploadedFile(file)
    } catch {
      setUploadedColumns([])
      setUploadedFileText("")
      const message = "The uploaded CSV could not be read. Please download it again and retry."
      setPageError(message)
      setPageErrorDetails(buildPageErrorDetails({ message }))
      setIsProcessing(false)
      return
    }
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
    if (file) void processSelectedFile(file)
  }

  const handleFileDrop = (file: File) => {
    void processSelectedFile(file)
  }

  const saveInventoryRows = async (rows: InventorySnapshotRow[], sourceType: "sales_csv" | "inventory_csv") => {
    if (rows.length === 0) return false

    const res = await fetch("/api/inventory-snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows,
        sourceType,
        asOfDate: getSnapshotAsOfDate(rows),
      }),
    })
    if (!res.ok) {
      throw new Error((await readApiError(res)).message)
    }

    const payload = (await res.json()) as InventorySnapshotStatus & { rowCount?: number }
    setInventoryStatus({
      hasSnapshot: true,
      metadata: payload.metadata,
      rowCount: Number(payload.rowCount ?? rows.length),
    })
    return true
  }

  const handleInventoryFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    await processInventorySnapshotFile(file)
  }

  const handleInventoryFileDrop = async (file: File) => {
    await processInventorySnapshotFile(file)
  }

  const processInventorySnapshotFile = async (file: File) => {
    const lowerName = file.name.toLowerCase()
    if (!lowerName.endsWith(".csv")) {
      setInventoryActionMessage("Inventory snapshot must be uploaded as a CSV file.")
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setInventoryActionMessage("Inventory snapshot file is too large. Maximum size is 10MB.")
      return
    }

    setInventoryActionMessage(null)
    setInventoryFile(file)
    try {
      const raw = await file.text()
      const structuralValidation = validateCsvStructure(raw, normalizedPlan)
      if (!structuralValidation.ok) {
        setInventoryActionMessage(structuralValidation.message)
        return
      }
      const parsed = parseInventoryRowsFromSnapshotCsv(raw, uploadedColumns, skuColumnName, storeColumnName)
      if (parsed.error || parsed.rows.length === 0) {
        setInventoryActionMessage(parsed.error || "No valid inventory rows were found.")
        return
      }
      await saveInventoryRows(parsed.rows, "inventory_csv")
      setInventoryActionMessage(`Inventory snapshot uploaded for ${parsed.rows.length} SKU-location pairs.`)
    } catch (error) {
      setInventoryActionMessage(error instanceof Error ? error.message : "Failed to process inventory snapshot file.")
    }
  }

  const clearInventorySnapshot = async () => {
    setInventoryActionMessage(null)
    try {
      const res = await fetch("/api/inventory-snapshot", { method: "DELETE" })
      if (!res.ok) {
        throw new Error((await readApiError(res)).message)
      }
      setInventoryFile(null)
      setInventoryStatus({ hasSnapshot: false, metadata: null, rowCount: 0 })
      setInventoryActionMessage("Inventory snapshot removed. Replenishment will fall back to estimated stock.")
    } catch (error) {
      setInventoryActionMessage(error instanceof Error ? error.message : "Failed to remove inventory snapshot.")
    }
  }

  useEffect(() => {
    if (uploadedColumns.length === 0) return
    setSkuColumnName((prev) =>
      uploadedColumns.includes(prev) ? prev : findMatchingHeader(uploadedColumns, ["sku", "sku_id", "skuid", "product", "productid", "product_id", "item", "itemid", "item_id"]) || prev
    )
    setStoreColumnName((prev) =>
      uploadedColumns.includes(prev) ? prev : findMatchingHeader(uploadedColumns, ["location", "store", "storeid", "store_id", "storename", "store_name", "shop", "shopid", "shop_id", "outlet", "outletid", "outlet_id", "branch", "branchid", "branch_id"]) || prev
    )
    setTargetVariable((prev) =>
      uploadedColumns.includes(prev) ? prev : findMatchingHeader(uploadedColumns, ["quantity", "qty", "demand", "sales", "units", "volume"]) || prev
    )
    setOnHandColumnName((prev) =>
      uploadedColumns.includes(prev)
        ? prev
        : findMatchingHeader(uploadedColumns, ["on_hand", "onhand", "remaining_stock", "remainingstocks", "stock_on_hand", "inventory", "inventory_on_hand"]) || prev
    )
    setPriceColumnName((prev) =>
      uploadedColumns.includes(prev) ? prev : findMatchingHeader(uploadedColumns, ["price", "unitprice", "sellingprice", "saleprice", "avgprice"]) || prev
    )
    setHolidayColumnName((prev) =>
      uploadedColumns.includes(prev) ? prev : findMatchingHeader(uploadedColumns, ["isholiday", "holiday", "holidayflag", "is_holiday"])
    )
    setPromotionColumnName((prev) =>
      uploadedColumns.includes(prev) ? prev : findMatchingHeader(uploadedColumns, ["promotion", "promo", "promotionflag", "is_promotion"])
    )
    setOpenStatusColumnName((prev) =>
      uploadedColumns.includes(prev) ? prev : findMatchingHeader(uploadedColumns, ["isshopopened", "isstoreopen", "isopen", "storeopen", "shopopen", "openflag"])
    )
  }, [uploadedColumns])

  const targetColumnValidation = useMemo<TargetColumnValidationSummary | null>(() => {
    if (!uploadedFileText || !targetVariable) return null

    const { headers, records } = parseCsvRecords(uploadedFileText)
    if (headers.length === 0 || records.length === 0) return null

    const resolvedTargetColumn = resolvePreferredHeader(headers, targetVariable, [
      "quantity",
      "qty",
      "demand",
      "sales",
      "units",
      "volume",
    ])
    if (!resolvedTargetColumn) {
      return {
        targetColumn: null,
        totalRows: records.length,
        validRows: 0,
        invalidRowCount: records.length,
        exampleInvalidRows: [],
      }
    }

    const resolvedSkuColumn = resolvePreferredHeader(headers, skuColumnName, [
      "sku",
      "sku_id",
      "skuid",
      "product",
      "productid",
      "product_id",
      "item",
      "itemid",
      "item_id",
    ])
    const resolvedStoreColumn = resolvePreferredHeader(headers, storeColumnName, [
      "location",
      "store",
      "storeid",
      "store_id",
      "storename",
      "store_name",
      "shop",
      "shopid",
      "shop_id",
      "outlet",
      "outletid",
      "outlet_id",
      "branch",
      "branchid",
      "branch_id",
    ])

    let validRows = 0
    const exampleInvalidRows: TargetColumnValidationSummary["exampleInvalidRows"] = []

    records.forEach((record, index) => {
      const rawValue = String(record[resolvedTargetColumn] || "").trim()
      const parsedValue = Number(rawValue)
      if (rawValue && Number.isFinite(parsedValue)) {
        validRows += 1
        return
      }

      if (exampleInvalidRows.length < 5) {
        exampleInvalidRows.push({
          rowNumber: index + 2,
          rawValue,
          sku: resolvedSkuColumn ? String(record[resolvedSkuColumn] || "").trim() || null : null,
          store: resolvedStoreColumn ? String(record[resolvedStoreColumn] || "").trim() || null : null,
          reason: rawValue ? "non-numeric or infinite" : "blank",
        })
      }
    })

    return {
      targetColumn: resolvedTargetColumn,
      totalRows: records.length,
      validRows,
      invalidRowCount: records.length - validRows,
      exampleInvalidRows,
    }
  }, [uploadedFileText, targetVariable, skuColumnName, storeColumnName])

  const localSeriesEstimate = useMemo<LocalSeriesEstimate | null>(() => {
    if (!uploadedFileText) return null
    const { headers, records } = parseCsvRecords(uploadedFileText)
    if (headers.length === 0 || records.length === 0) return null

    const resolvedSkuColumn = resolvePreferredHeader(headers, skuColumnName, [
      "sku",
      "sku_id",
      "skuid",
      "product",
      "productid",
      "product_id",
      "item",
      "itemid",
      "item_id",
    ])
    const resolvedStoreColumn = resolvePreferredHeader(headers, storeColumnName, [
      "location",
      "store",
      "storeid",
      "store_id",
      "storename",
      "store_name",
      "shop",
      "shopid",
      "shop_id",
      "outlet",
      "outletid",
      "outlet_id",
      "branch",
      "branchid",
      "branch_id",
    ])

    const seriesKeys = new Set(
      records.map((record) => {
        const skuValue = resolvedSkuColumn ? String(record[resolvedSkuColumn] || "").trim() : ""
        const storeValue = resolvedStoreColumn ? String(record[resolvedStoreColumn] || "").trim() : ""
        return `${skuValue || "SKU-1"}::${storeValue || "location-1"}`
      })
    )

    return {
      count: seriesKeys.size,
      skuColumn: resolvedSkuColumn || null,
      storeColumn: resolvedStoreColumn || null,
    }
  }, [uploadedFileText, skuColumnName, storeColumnName])

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
        body: JSON.stringify({
          provider,
          accountName,
          accountId,
          availableTables,
          selectedTables: selectedObjects,
          sourceConfig,
        }),
      })
      if (!res.ok) throw new Error((await readApiError(res)).message)
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
      if (!res.ok) throw new Error((await readApiError(res)).message)
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
          selectedTables: effectiveSelectedTables,
          syncMode,
          sourceConfig,
          adapter: provider === "other" ? activeAdapter : undefined,
        }),
      })
      if (!res.ok) throw new Error((await readApiError(res)).message)
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
        body: JSON.stringify({
          model,
          mode,
          seasonality,
          dateFormat,
          skuColumnName,
          storeColumnName,
          targetVariable,
          onHandColumnName,
          priceColumnName,
          holidayColumnName,
          promotionColumnName,
          openStatusColumnName,
          forecastHorizon: Number(forecastHorizon),
        }),
      })
      if (!res.ok) throw new Error((await readApiError(res)).message)
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
    if (effectiveSelectedTables.length === 0) {
      setImportSummary({ status: "error", message: "Choose at least one table/object before importing." })
      return
    }

    setImportSummary({ status: "running", message: "Import in progress..." })
    try {
      const saveRes = await fetch(`/api/data-sources/${encodeURIComponent(activeSource.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availableTables: availableObjects,
          selectedTables: effectiveSelectedTables,
          syncMode,
          sourceConfig,
        }),
      })
      if (!saveRes.ok) throw new Error((await readApiError(saveRes)).message)

      const res = await fetch(`/api/data-sources/${encodeURIComponent(activeSource.id)}/sync`, { method: "POST" })
      if (!res.ok) throw new Error((await readApiError(res)).message)
      const payload = (await res.json()) as { run?: { message?: string } }

      await loadConnectorState()
      await loadHealth()
      setImportSummary({
        status: "success",
        message: payload?.run?.message || `Imported ${effectiveSelectedTables.length} table(s).`,
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
      if (!res.ok) throw new Error((await readApiError(res)).message)
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

  const buildForecastRunAssumptionsPrompt = (): ForecastRunAssumptionsPrompt | null => {
    if (!uploadedFileText || !targetVariable) return null

    const { headers, records } = parseCsvRecords(uploadedFileText)
    if (headers.length === 0 || records.length === 0) return null

    const dateHeader = findMatchingHeader(headers, ["date"])
    const targetHeader = headers.includes(targetVariable) ? targetVariable : findMatchingHeader(headers, [targetVariable])
    if (!dateHeader || !targetHeader) return null

    const parsedRows = records
      .map((record) => {
        const parsedDate = parseDateByFormat(record[dateHeader] || "", dateFormat)
        const targetValue = toNumberOrNull(record[targetHeader])
        return {
          record,
          date: parsedDate,
          targetValue,
        }
      })
      .filter((row) => row.date && row.targetValue !== null) as Array<{ record: ParsedCsvRecord; date: Date; targetValue: number }>

    if (parsedRows.length === 0) return null

    const lastObservedDate = parsedRows.reduce((latest, row) => (row.date > latest ? row.date : latest), parsedRows[0].date)
    const horizonDays = Math.max(1, Number.parseInt(forecastHorizon, 10) || 30)
    const forecastWindowStart = toIsoDate(addDaysUtc(lastObservedDate, 1))
    const forecastWindowEnd = toIsoDate(addDaysUtc(lastObservedDate, horizonDays))

    const stateHeader = findMatchingHeader(headers, ["state", "storestate", "regionstate"])
    const stateCandidates = stateHeader
      ? Array.from(new Set(parsedRows.map((row) => (row.record[stateHeader] || "").trim()).filter(Boolean))).sort()
      : []

    const positiveSales = parsedRows.map((row) => row.targetValue).filter((value) => value > 0)
    const baselineSales = median(positiveSales) ?? median(parsedRows.map((row) => row.targetValue)) ?? 0
    const lowSalesThreshold = baselineSales > 0 ? baselineSales * 0.05 : 0

    const detectedClosedWeekdays: ForecastClosedWeekdaySuggestion[] = []
    const openHeader = headers.includes(openStatusColumnName) ? openStatusColumnName : findMatchingHeader(headers, [openStatusColumnName])
    if (openStatusColumnName && openHeader) {
      for (let weekday = 1; weekday <= 7; weekday += 1) {
        const weekdayRows = parsedRows.filter((row) => row.date.getUTCDay() === (weekday % 7))
        if (weekdayRows.length < 3) continue

        const lowSalesRows = weekdayRows.filter((row) => row.targetValue <= lowSalesThreshold)
        const closedRows = weekdayRows.filter((row) => toBooleanFlag(row.record[openHeader]) === false)
        const lowSalesShare = lowSalesRows.length / weekdayRows.length
        const closedShare = closedRows.length / weekdayRows.length
        const averageSales = weekdayRows.reduce((sum, row) => sum + row.targetValue, 0) / weekdayRows.length
        const isStrongPattern =
          (closedShare >= 0.5 && lowSalesShare >= 0.5) ||
          (closedShare >= 0.75 && averageSales <= lowSalesThreshold) ||
          lowSalesShare >= 0.85

        if (!isStrongPattern) continue

        detectedClosedWeekdays.push({
          weekday,
          label: WEEKDAY_LABELS[weekday - 1],
          sampleCount: weekdayRows.length,
          averageSales: Number(averageSales.toFixed(2)),
          lowSalesShare: Number((lowSalesShare * 100).toFixed(1)),
          closedShare: Number((closedShare * 100).toFixed(1)),
          reason:
            closedShare >= 0.5
              ? `Store-open flag is off on ${Math.round(closedShare * 100)}% of ${WEEKDAY_LABELS[weekday - 1]} rows and sales stay at 5% or less of typical demand.`
              : `Sales stay at 5% or less of typical demand on ${Math.round(lowSalesShare * 100)}% of ${WEEKDAY_LABELS[weekday - 1]} rows.`,
        })
      }
    }

    const askHolidayRanges = Boolean(holidayColumnName && findMatchingHeader(headers, [holidayColumnName]))
    const askPromotionRanges = Boolean(promotionColumnName && findMatchingHeader(headers, [promotionColumnName]))
    const askStoreState = askHolidayRanges

    if (!detectedClosedWeekdays.length && !askHolidayRanges && !askPromotionRanges) {
      return null
    }

    return {
      forecastWindowStart,
      forecastWindowEnd,
      detectedClosedWeekdays,
      askHolidayRanges,
      askPromotionRanges,
      askStoreState,
      stateCandidates,
    }
  }

  const startForecasting = async (futureAssumptions?: ForecastFutureAssumptions | null) => {
    const sourceImport = !uploadedFile ? activeSource?.latestImport || null : null
    if (!uploadedFile && !sourceImport) return
    setIsProcessing(true)
    setRunStatus(null)

    try {
      let s3Key = sourceImport?.s3Key || ""
      let s3Bucket = sourceImport?.s3Bucket || ""
      const originalFilename = sourceImport ? `${activeSource?.provider || "source"}-normalized-import.csv` : uploadedFile?.name || "upload.csv"
      const resolvedDateFormat = sourceImport ? "yyyy-mm-dd" : dateFormat
      const resolvedSkuColumnName = sourceImport ? "sku" : skuColumnName
      const resolvedStoreColumnName = sourceImport ? "store" : storeColumnName
      const resolvedTargetVariable = sourceImport ? "sales" : targetVariable
      const resolvedOnHandColumnName = sourceImport ? (sourceImport.inventoryRowCount > 0 ? "on_hand" : "") : onHandColumnName
      const resolvedPriceColumnName = sourceImport ? "price" : priceColumnName
      const resolvedHolidayColumnName = sourceImport ? "" : holidayColumnName
      const resolvedPromotionColumnName = sourceImport ? "" : promotionColumnName
      const resolvedOpenStatusColumnName = sourceImport ? "" : openStatusColumnName

      if (!sourceImport) {
        const scopeValidation = validateSalesCsvScope({
          raw: uploadedFileText,
          dateFormat,
          skuColumnName,
          storeColumnName,
          plan: normalizedPlan,
        })
        if (!scopeValidation.ok) {
          setPageError(scopeValidation.message)
          setPageErrorDetails(buildPageErrorDetails({ code: scopeValidation.code, message: scopeValidation.message }))
          setRunStatus({ message: scopeValidation.message })
          setIsProcessing(false)
          return
        }

        const uploadRes = await fetch("/api/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: uploadedFile!.name,
            contentType: uploadedFile!.type || "text/csv",
            fileSize: uploadedFile!.size,
          }),
        })

        if (!uploadRes.ok) {
          const uploadError = await readApiError(uploadRes)
          setPageError(uploadError.message)
          setPageErrorDetails(buildPageErrorDetails({
            code: uploadError.code,
            message: uploadError.message,
            details: uploadError.details,
            retryAfterSeconds: uploadError.retryAfterSeconds,
          }))
          setRunStatus({ message: uploadError.message })
          setIsProcessing(false)
          return
        }

        const uploadPayload = await uploadRes.json()
        s3Key = uploadPayload.s3Key
        s3Bucket = uploadPayload.s3Bucket

        const putRes = await fetch(uploadPayload.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": uploadedFile!.type || "text/csv" },
          body: uploadedFile!,
        })

        if (!putRes.ok) {
          setRunStatus({ message: `Upload failed: ${putRes.status}` })
          setIsProcessing(false)
          return
        }

        setUploadProgress(100)

        if (targetColumnValidation && !targetColumnValidation.targetColumn) {
          setRunStatus({ message: `Selected target column ${targetVariable} was not found in the uploaded CSV.` })
          setIsProcessing(false)
          return
        }

        if (targetColumnValidation && targetColumnValidation.invalidRowCount > 0) {
          const sample = targetColumnValidation.exampleInvalidRows[0]
          const sampleText = sample ? ` Example row ${sample.rowNumber}: ${sample.rawValue || "(blank)"}.` : ""
          setRunStatus({
            message: `${targetColumnValidation.targetColumn || targetVariable} contains ${targetColumnValidation.invalidRowCount} invalid value(s). Fix the target column before starting forecasting.${sampleText}`,
          })
          setIsProcessing(false)
          return
        }
      }

      const futureAssumptionsJson = futureAssumptions ? JSON.stringify(futureAssumptions) : null
      console.info("[forecast] submitting future assumptions", {
        futureAssumptions,
        futureAssumptionsJson,
      })

      const inferredInventoryRows = !sourceImport && onHandColumnName
        ? extractInventoryRowsFromSalesCsv({
            raw: uploadedFileText,
            dateFormat,
            skuColumnName,
            storeColumnName,
            onHandColumnName,
          })
        : []
      if (inferredInventoryRows.length > 0) {
        try {
          await saveInventoryRows(inferredInventoryRows, "sales_csv")
          setInventoryActionMessage(`Updated inventory snapshot from the main CSV for ${inferredInventoryRows.length} SKU-location pairs.`)
        } catch (error) {
          setInventoryActionMessage(
            error instanceof Error ? `Forecast started, but inventory snapshot was not updated: ${error.message}` : "Forecast started, but inventory snapshot was not updated."
          )
        }
      }

      const runRes = await fetch("/api/forecast/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          s3Bucket,
          s3Key,
          originalFilename,
          model,
          mode,
          seasonality,
          dateFormat: resolvedDateFormat,
          skuColumnName: resolvedSkuColumnName,
          storeColumnName: resolvedStoreColumnName,
          targetVariable: resolvedTargetVariable,
          onHandColumnName: resolvedOnHandColumnName,
          priceColumnName: resolvedPriceColumnName,
          holidayColumnName: resolvedHolidayColumnName,
          promotionColumnName: resolvedPromotionColumnName,
          openStatusColumnName: resolvedOpenStatusColumnName,
          forecastHorizon: Number(forecastHorizon),
          futureAssumptionsJson,
        }),
      })

      const runJson = await runRes.json()
      if (!runRes.ok || runJson?.status === "error") {
        const message = String(runJson?.message || runJson?.error || "Failed to start forecast run")
        setPageError(message)
        setPageErrorDetails(buildPageErrorDetails({
          code: String(runJson?.code || runJson?.result?.code || "UPLOAD_KEY_NOT_ALLOWED"),
          message,
          details: typeof runJson?.details === "object" && runJson?.details ? runJson.details : runJson?.result,
          retryAfterSeconds: typeof runJson?.retryAfterSeconds === "number" ? runJson.retryAfterSeconds : undefined,
        }))
        setRunStatus({ message })
        setIsProcessing(false)
        return
      }

      await fetch("/api/tenant-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          mode,
          seasonality,
          dateFormat,
          skuColumnName,
          storeColumnName,
          targetVariable,
          onHandColumnName,
          priceColumnName,
          holidayColumnName,
          promotionColumnName,
          openStatusColumnName,
          forecastHorizon: Number(forecastHorizon),
        }),
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
      const message = "Unexpected error starting forecast"
      setPageError(message)
      setPageErrorDetails(buildPageErrorDetails({ message }))
      setRunStatus({ message })
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
    activeBlueprint,
    activeDiagnostics,
    connectionState,
    connectedAccount,
    connectedAt,
    canManageSources,
    handleConnect,
    handleDisconnect,
    handleFileUpload,
    handleFileDrop,
    handleInventoryFileUpload,
    handleInventoryFileDrop,
    uploadedFile,
    inventoryFile,
    uploadedColumns,
    isProcessing,
    uploadProgress,
    inventoryStatus,
    inventoryActionMessage,
    runDueImports,
    runImportNow,
    startForecasting,
    clearInventorySnapshot,
    buildForecastRunAssumptionsPrompt,
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
    effectiveSelectedTables,
    syncMode,
    setSyncMode,
    sourceConfig,
    setSourceConfig,
    dateFormat,
    setDateFormat,
    skuColumnName,
    setSkuColumnName,
    storeColumnName,
    setStoreColumnName,
    targetVariable,
    setTargetVariable,
    onHandColumnName,
    setOnHandColumnName,
    priceColumnName,
    setPriceColumnName,
    holidayColumnName,
    setHolidayColumnName,
    promotionColumnName,
    setPromotionColumnName,
    openStatusColumnName,
    setOpenStatusColumnName,
    forecastHorizon,
    setForecastHorizon,
    localSeriesEstimate,
    targetColumnValidation,
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
    pageErrorDetails,
    clearPageError: () => {
      setPageError(null)
      setPageErrorDetails(null)
    },
  }
}
