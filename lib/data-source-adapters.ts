export type AdapterKind = "csv" | "api"

export type AdapterTemplate = {
  id: string
  kind: AdapterKind
  name: string
  description: string
  requiredFields: string[]
  sampleConfig: Record<string, unknown>
}

export type DataSourceAdapterConfig = {
  templateId: string
  kind: AdapterKind
  endpointUrl?: string
  fileDelimiter?: "," | ";" | "\t" | "|"
  authType?: "none" | "bearer" | "api-key"
  authHeaderName?: string
  authToken?: string
  columnMapping: Record<string, string>
  notes?: string
  updatedAt: string
}

const TEMPLATES: AdapterTemplate[] = [
  {
    id: "csv-basic",
    kind: "csv",
    name: "CSV Basic",
    description: "Single CSV file with date, sku, quantity, and optional location columns.",
    requiredFields: ["date", "sku", "quantity"],
    sampleConfig: {
      fileDelimiter: ",",
      columnMapping: {
        date: "date",
        sku: "sku",
        quantity: "units",
      },
    },
  },
  {
    id: "csv-warehouse",
    kind: "csv",
    name: "CSV Warehouse",
    description: "Inventory snapshot CSV with warehouse and on-hand quantity.",
    requiredFields: ["snapshot_date", "sku", "warehouse", "on_hand_qty"],
    sampleConfig: {
      fileDelimiter: ",",
      columnMapping: {
        snapshot_date: "snapshot_date",
        sku: "sku",
        warehouse: "warehouse_code",
        on_hand_qty: "on_hand",
      },
    },
  },
  {
    id: "api-rest-basic",
    kind: "api",
    name: "REST API Basic",
    description: "Periodic pull from unauthenticated JSON endpoint.",
    requiredFields: ["endpointUrl"],
    sampleConfig: {
      endpointUrl: "https://api.example.com/inventory",
      authType: "none",
      columnMapping: {
        sku: "sku",
        quantity: "quantity",
        date: "updated_at",
      },
    },
  },
  {
    id: "api-rest-auth",
    kind: "api",
    name: "REST API Authenticated",
    description: "Bearer/API-key protected endpoint for orders and stock feeds.",
    requiredFields: ["endpointUrl", "authType", "authToken"],
    sampleConfig: {
      endpointUrl: "https://api.example.com/orders",
      authType: "bearer",
      authHeaderName: "Authorization",
      columnMapping: {
        sku: "line_items[0].sku",
        quantity: "line_items[0].qty",
        date: "created_at",
      },
    },
  },
]

export const listAdapterTemplates = () => TEMPLATES

const normalizeAdapterKind = (value: unknown): AdapterKind => (value === "api" ? "api" : "csv")

const normalizeDelimiter = (value: unknown): DataSourceAdapterConfig["fileDelimiter"] => {
  if (value === "," || value === ";" || value === "\t" || value === "|") return value
  return ","
}

const normalizeAuthType = (value: unknown): DataSourceAdapterConfig["authType"] => {
  if (value === "bearer" || value === "api-key") return value
  return "none"
}

const sanitizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "")

export const normalizeAdapterConfig = (value: unknown): DataSourceAdapterConfig | null => {
  const input = typeof value === "object" && value ? (value as Record<string, unknown>) : null
  if (!input) return null

  const templateId = sanitizeText(input.templateId)
  if (!templateId) return null

  const columnInput =
    typeof input.columnMapping === "object" && input.columnMapping
      ? (input.columnMapping as Record<string, unknown>)
      : {}
  const columnMapping: Record<string, string> = {}
  for (const [key, val] of Object.entries(columnInput)) {
    const nextKey = sanitizeText(key)
    const nextVal = sanitizeText(val)
    if (nextKey && nextVal) columnMapping[nextKey] = nextVal
  }

  const now = new Date().toISOString()
  return {
    templateId,
    kind: normalizeAdapterKind(input.kind),
    endpointUrl: sanitizeText(input.endpointUrl) || undefined,
    fileDelimiter: normalizeDelimiter(input.fileDelimiter),
    authType: normalizeAuthType(input.authType),
    authHeaderName: sanitizeText(input.authHeaderName) || undefined,
    authToken: sanitizeText(input.authToken) || undefined,
    columnMapping,
    notes: sanitizeText(input.notes) || undefined,
    updatedAt: sanitizeText(input.updatedAt) || now,
  }
}

export const normalizeAdapterMap = (value: unknown): Record<string, DataSourceAdapterConfig> => {
  const input = typeof value === "object" && value ? (value as Record<string, unknown>) : {}
  const map: Record<string, DataSourceAdapterConfig> = {}
  for (const [sourceId, raw] of Object.entries(input)) {
    const parsed = normalizeAdapterConfig(raw)
    if (parsed) map[sourceId] = parsed
  }
  return map
}
