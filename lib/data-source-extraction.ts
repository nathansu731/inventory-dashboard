import crypto from "crypto"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import {
  type DataSourceImportArtifact,
  type DataSourceRecord,
} from "@/lib/data-sources"
import { decryptSecret } from "@/lib/data-source-secrets"
import { buildSourceDiagnostics } from "@/lib/data-source-diagnostics"
import { saveInventorySnapshot, type InventorySnapshotRow } from "@/lib/inventory-snapshot"
import { getPlanFileGuardrailLimits, normalizeTenantPlan, type TenantPlan } from "@/lib/upload-guardrails"

const s3 = new S3Client({})
const RAW_BUCKET = process.env.S3_RAW_BUCKET || ""

type SecretEntry = Record<string, unknown> | null

type CanonicalForecastRow = {
  date: string
  sku: string
  store: string
  sales: number
  price?: number | null
  on_hand?: number | null
}

type ExtractionPayload = {
  rows: CanonicalForecastRow[]
  inventoryRows: InventorySnapshotRow[]
  reachableTables: string[]
  grantedScopes?: string[]
}

type PersistedExtraction = {
  artifact: DataSourceImportArtifact
  summaryMessage: string
}

const sanitizeText = (value: unknown) => (typeof value === "string" || typeof value === "number" ? String(value).trim() : "")
const toFiniteNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
const toIsoDate = (value: string | Date | null | undefined) => {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}
const unique = <T,>(items: T[]) => Array.from(new Set(items))

const csvEscape = (value: unknown) => {
  const stringValue = value === null || value === undefined ? "" : String(value)
  if (!/[",\n]/.test(stringValue)) return stringValue
  return `"${stringValue.replace(/"/g, "\"\"")}"`
}

const rowsToCsv = (rows: CanonicalForecastRow[]) => {
  const headers = ["date", "sku", "store", "sales", "price", "on_hand"]
  const body = rows.map((row) =>
    headers
      .map((header) => {
        if (header === "date") return csvEscape(row.date)
        if (header === "sku") return csvEscape(row.sku)
        if (header === "store") return csvEscape(row.store)
        if (header === "sales") return csvEscape(row.sales)
        if (header === "price") return csvEscape(row.price ?? "")
        return csvEscape(row.on_hand ?? "")
      })
      .join(",")
  )
  return `${headers.join(",")}\n${body.join("\n")}`
}

const getLinkNext = (header: string | null) => {
  if (!header) return ""
  const match = header.match(/<([^>]+)>;\s*rel="next"/i)
  return match?.[1] || ""
}

const persistExtractionArtifact = async ({
  tenantId,
  source,
  runId,
  rows,
  inventoryRows,
}: {
  tenantId: string
  source: DataSourceRecord
  runId: string
  rows: CanonicalForecastRow[]
  inventoryRows: InventorySnapshotRow[]
}): Promise<PersistedExtraction> => {
  if (!RAW_BUCKET) {
    throw new Error("missing_raw_bucket")
  }
  if (rows.length === 0) {
    throw new Error("no_compatible_rows")
  }

  const extractedAt = new Date().toISOString()
  const seriesKeys = new Set(rows.map((row) => `${row.sku}::${row.store || "Unknown"}`))
  const skus = new Set(rows.map((row) => row.sku))
  const sortedDates = rows.map((row) => row.date).filter(Boolean).sort()
  const prefix = `tenant-raw/${tenantId}/connector-imports/${source.provider}/${source.id}/${extractedAt.replace(/[:.]/g, "-")}`
  const s3Key = `${prefix}/normalized.csv`
  const summaryKey = `${prefix}/summary.json`
  const previewRows = rows.slice(0, 10)
  const csv = rowsToCsv(rows)

  await s3.send(
    new PutObjectCommand({
      Bucket: RAW_BUCKET,
      Key: s3Key,
      ContentType: "text/csv",
      Body: csv,
    })
  )

  await s3.send(
    new PutObjectCommand({
      Bucket: RAW_BUCKET,
      Key: summaryKey,
      ContentType: "application/json",
      Body: JSON.stringify({
        version: 1,
        provider: source.provider,
        sourceId: source.id,
        sourceConfig: source.sourceConfig,
        extractedAt,
        rowCount: rows.length,
        inventoryRowCount: inventoryRows.length,
        uniqueSkus: skus.size,
        uniqueSeries: seriesKeys.size,
        dateStart: sortedDates[0] || null,
        dateEnd: sortedDates[sortedDates.length - 1] || null,
        previewRows,
      }),
    })
  )

  if (inventoryRows.length > 0) {
    const asOfDate = inventoryRows.map((row) => row.asOfDate || "").filter(Boolean).sort().at(-1) || null
    await saveInventorySnapshot({
      tenantId,
      rows: inventoryRows,
      sourceType: "source_import",
      asOfDate,
    })
  }

  const artifact: DataSourceImportArtifact = {
    s3Bucket: RAW_BUCKET,
    s3Key,
    summaryKey,
    rowCount: rows.length,
    inventoryRowCount: inventoryRows.length,
    extractedAt,
    sourceRunId: runId,
    columnNames: ["date", "sku", "store", "sales", "price", "on_hand"],
    dateStart: sortedDates[0] || null,
    dateEnd: sortedDates[sortedDates.length - 1] || null,
    uniqueSkus: skus.size,
    uniqueSeries: seriesKeys.size,
  }

  return {
    artifact,
    summaryMessage: `Extracted ${rows.length} rows across ${seriesKeys.size} SKU-location series${inventoryRows.length > 0 ? ` and ${inventoryRows.length} inventory snapshots` : ""}.`,
  }
}

const filterRowsByRange = (rows: CanonicalForecastRow[], startDate: string, endDate: string) =>
  rows.filter((row) => (!startDate || row.date >= startDate) && (!endDate || row.date <= endDate))

const buildExtractionRestrictionError = ({
  code,
  message,
  details,
}: {
  code: string
  message: string
  details?: Record<string, unknown>
}) => {
  const error = new Error(message) as Error & { code?: string; details?: Record<string, unknown> }
  error.code = code
  error.details = details
  return error
}

const validateCanonicalRowsForPlan = (rows: CanonicalForecastRow[], plan: TenantPlan) => {
  const limits = getPlanFileGuardrailLimits(plan)
  if (rows.length > limits.maxRows) {
    throw buildExtractionRestrictionError({
      code: "UPLOAD_ROWS_LIMIT_EXCEEDED",
      message: `This ${plan} plan supports up to ${limits.maxRows.toLocaleString("en-US")} imported rows per run. Narrow the connector date range and try again.`,
      details: {
        maxRows: limits.maxRows,
        actualRows: rows.length,
      },
    })
  }

  let minDateMs: number | null = null
  let maxDateMs: number | null = null
  const seriesCounts = new Map<string, number>()

  rows.forEach((row) => {
    const parsedDate = Date.parse(row.date)
    if (Number.isFinite(parsedDate)) {
      minDateMs = minDateMs === null ? parsedDate : Math.min(minDateMs, parsedDate)
      maxDateMs = maxDateMs === null ? parsedDate : Math.max(maxDateMs, parsedDate)
    }
    const seriesKey = `${row.sku || "SKU-1"}::${row.store || "location-1"}`
    seriesCounts.set(seriesKey, (seriesCounts.get(seriesKey) || 0) + 1)
  })

  const historySpanDays =
    minDateMs !== null && maxDateMs !== null ? Math.floor((maxDateMs - minDateMs) / 86400000) : 0
  if (historySpanDays > limits.maxHistoryDays) {
    throw buildExtractionRestrictionError({
      code: "HISTORY_WINDOW_EXCEEDED",
      message: `Connector history spans ${historySpanDays} days. Limit connector imports to the most recent ${limits.maxHistoryDays} days for the ${plan} plan.`,
      details: {
        historySpanDays,
        maxHistoryDays: limits.maxHistoryDays,
      },
    })
  }

  if (seriesCounts.size > limits.maxSeries) {
    throw buildExtractionRestrictionError({
      code: "PLAN_SERIES_LIMIT_EXCEEDED",
      message: `This ${plan} plan supports up to ${limits.maxSeries.toLocaleString("en-US")} SKU-location series per imported run. Reduce the connector scope and try again.`,
      details: {
        seriesCount: seriesCounts.size,
        maxSeries: limits.maxSeries,
      },
    })
  }

  const maxSeriesPoints = Array.from(seriesCounts.values()).reduce((max, count) => Math.max(max, count), 0)
  if (maxSeriesPoints > limits.maxSeriesPoints) {
    throw buildExtractionRestrictionError({
      code: "SERIES_POINTS_LIMIT_EXCEEDED",
      message: `At least one imported SKU-location series contains ${maxSeriesPoints} data points. Limit each series to ${limits.maxSeriesPoints} rows or fewer for the ${plan} plan.`,
      details: {
        maxSeriesPoints,
        allowedSeriesPoints: limits.maxSeriesPoints,
      },
    })
  }
}

const shopifyHeaders = (accessToken: string) => ({
  "X-Shopify-Access-Token": accessToken,
  Accept: "application/json",
})

const fetchShopifyPaginated = async <T>({
  url,
  accessToken,
  itemKey,
}: {
  url: string
  accessToken: string
  itemKey: string
}) => {
  const items: T[] = []
  let nextUrl = url
  while (nextUrl) {
    const response = await fetch(nextUrl, {
      method: "GET",
      headers: shopifyHeaders(accessToken),
      cache: "no-store",
    })
    if (!response.ok) {
      throw new Error(`shopify_fetch_failed_${response.status}`)
    }
    const payload = (await response.json()) as Record<string, unknown>
    const pageItems = Array.isArray(payload[itemKey]) ? (payload[itemKey] as T[]) : []
    items.push(...pageItems)
    nextUrl = getLinkNext(response.headers.get("link"))
  }
  return items
}

const extractShopify = async ({
  source,
  secretEntry,
}: {
  source: DataSourceRecord
  secretEntry: SecretEntry
}): Promise<ExtractionPayload> => {
  const shopDomain = sanitizeText(secretEntry?.shopDomain).toLowerCase()
  const accessToken = await decryptSecret(secretEntry?.accessToken)
  if (!shopDomain || !accessToken) {
    throw new Error("missing_shopify_credentials")
  }

  const orderDateField = source.sourceConfig?.orderDateField || "processed_at"
  const startDate = source.sourceConfig?.historicalStartDate || ""
  const endDate = source.sourceConfig?.historicalEndDate || ""
  const dateMinKey = orderDateField === "created_at" ? "created_at_min" : orderDateField === "updated_at" ? "updated_at_min" : "processed_at_min"
  const dateMaxKey = orderDateField === "created_at" ? "created_at_max" : orderDateField === "updated_at" ? "updated_at_max" : "processed_at_max"
  const orderUrl = new URL(`https://${shopDomain}/admin/api/2024-10/orders.json`)
  orderUrl.searchParams.set("status", "any")
  orderUrl.searchParams.set("limit", "250")
  orderUrl.searchParams.set("fields", "id,created_at,processed_at,updated_at,cancelled_at,line_items")
  if (startDate) orderUrl.searchParams.set(dateMinKey, `${startDate}T00:00:00Z`)
  if (endDate) orderUrl.searchParams.set(dateMaxKey, `${endDate}T23:59:59Z`)

  const orders = await fetchShopifyPaginated<Record<string, unknown>>({
    url: orderUrl.toString(),
    accessToken,
    itemKey: "orders",
  })

  const inventoryBySku = new Map<string, number>()
  if (source.selectedTables.includes("products") || source.selectedTables.includes("inventory_levels")) {
    const productUrl = new URL(`https://${shopDomain}/admin/api/2024-10/products.json`)
    productUrl.searchParams.set("limit", "250")
    productUrl.searchParams.set("fields", "id,title,variants")
    const products = await fetchShopifyPaginated<Record<string, unknown>>({
      url: productUrl.toString(),
      accessToken,
      itemKey: "products",
    })

    const inventoryItemIds: Array<{ sku: string; inventoryItemId: string }> = []
    for (const product of products) {
      const variants = Array.isArray(product.variants) ? (product.variants as Array<Record<string, unknown>>) : []
      for (const variant of variants) {
        const sku = sanitizeText(variant.sku)
        if (!sku) continue
        const inventoryQuantity = toFiniteNumber(variant.inventory_quantity)
        if (inventoryQuantity !== null) {
          inventoryBySku.set(sku, inventoryQuantity)
        }
        const inventoryItemId = sanitizeText(variant.inventory_item_id)
        if (inventoryItemId) {
          inventoryItemIds.push({ sku, inventoryItemId })
        }
      }
    }

    if (source.selectedTables.includes("inventory_levels") && inventoryItemIds.length > 0) {
      const byInventoryItemId = new Map<string, string>()
      inventoryItemIds.forEach((entry) => byInventoryItemId.set(entry.inventoryItemId, entry.sku))
      const ids = unique(inventoryItemIds.map((entry) => entry.inventoryItemId))
      for (let index = 0; index < ids.length; index += 50) {
        const chunk = ids.slice(index, index + 50)
        const inventoryUrl = new URL(`https://${shopDomain}/admin/api/2024-10/inventory_levels.json`)
        inventoryUrl.searchParams.set("limit", "250")
        inventoryUrl.searchParams.set("inventory_item_ids", chunk.join(","))
        const response = await fetch(inventoryUrl.toString(), {
          method: "GET",
          headers: shopifyHeaders(accessToken),
          cache: "no-store",
        })
        if (!response.ok) continue
        const payload = (await response.json()) as { inventory_levels?: Array<Record<string, unknown>> }
        for (const level of payload.inventory_levels || []) {
          const itemId = sanitizeText(level.inventory_item_id)
          const sku = byInventoryItemId.get(itemId)
          const available = toFiniteNumber(level.available)
          if (!sku || available === null) continue
          inventoryBySku.set(sku, (inventoryBySku.get(sku) || 0) + available)
        }
      }
    }
  }

  const rows: CanonicalForecastRow[] = []
  for (const order of orders) {
    if (!source.sourceConfig?.includeCancelled && order.cancelled_at) continue
    const orderDate = toIsoDate(sanitizeText(order[orderDateField]) || sanitizeText(order.processed_at) || sanitizeText(order.created_at))
    if (!orderDate) continue
    const lineItems = Array.isArray(order.line_items) ? (order.line_items as Array<Record<string, unknown>>) : []
    for (const line of lineItems) {
      const sku = sanitizeText(line.sku)
      const quantity = toFiniteNumber(line.quantity)
      if (!sku || quantity === null || quantity <= 0) continue
      const price = toFiniteNumber(line.price)
      rows.push({
        date: orderDate,
        sku,
        store: source.accountId || source.accountName || shopDomain,
        sales: quantity,
        price,
        on_hand: inventoryBySku.get(sku) ?? null,
      })
    }
  }

  const inventoryRows: InventorySnapshotRow[] = Array.from(inventoryBySku.entries()).map(([sku, onHand]) => ({
    sku,
    store: source.accountId || source.accountName || shopDomain,
    onHand,
    asOfDate: endDate || new Date().toISOString().slice(0, 10),
  }))

  return {
    rows: filterRowsByRange(rows, startDate, endDate),
    inventoryRows,
    reachableTables: unique(["orders", ...(inventoryRows.length > 0 ? ["products", "inventory_levels"] : [])]),
    grantedScopes: sanitizeText(secretEntry?.tokenScope)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  }
}

const refreshQuickBooksAccessToken = async (refreshToken: string) => {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID || ""
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET || ""
  if (!clientId || !clientSecret) {
    throw new Error("missing_quickbooks_credentials")
  }
  const basic = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64")
  const tokenRes = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  })
  if (!tokenRes.ok) {
    throw new Error(`quickbooks_refresh_failed_${tokenRes.status}`)
  }
  const payload = (await tokenRes.json()) as { access_token?: string }
  if (!payload.access_token) throw new Error("quickbooks_refresh_failed")
  return payload.access_token
}

const queryQuickBooksAll = async ({
  realmId,
  accessToken,
  query,
}: {
  realmId: string
  accessToken: string
  query: string
}) => {
  const items: Record<string, unknown>[] = []
  let startPosition = 1
  const pageSize = 500
  while (true) {
    const url = `https://quickbooks.api.intuit.com/v3/company/${realmId}/query?query=${encodeURIComponent(`${query} startposition ${startPosition} maxresults ${pageSize}`)}`
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    })
    if (!response.ok) {
      throw new Error(`quickbooks_fetch_failed_${response.status}`)
    }
    const payload = (await response.json()) as { QueryResponse?: Record<string, unknown> }
    const responseBody = payload.QueryResponse || {}
    const entityKey = Object.keys(responseBody).find((key) => Array.isArray(responseBody[key]))
    const pageItems = entityKey ? ((responseBody[entityKey] as Array<Record<string, unknown>>) || []) : []
    items.push(...pageItems)
    if (pageItems.length < pageSize) break
    startPosition += pageSize
  }
  return items
}

const extractQuickBooks = async ({
  source,
  secretEntry,
}: {
  source: DataSourceRecord
  secretEntry: SecretEntry
}): Promise<ExtractionPayload> => {
  const realmId = sanitizeText(secretEntry?.realmId)
  let accessToken = await decryptSecret(secretEntry?.accessToken)
  const refreshToken = await decryptSecret(secretEntry?.refreshToken)
  if (!accessToken && refreshToken) {
    accessToken = await refreshQuickBooksAccessToken(refreshToken)
  }
  if (!realmId || !accessToken) {
    throw new Error("missing_quickbooks_credentials")
  }

  const salesEntity = source.sourceConfig?.salesEntity || "sales_receipts"
  const startDate = source.sourceConfig?.historicalStartDate || ""
  const endDate = source.sourceConfig?.historicalEndDate || ""
  const salesType =
    salesEntity === "invoices" ? "Invoice" : salesEntity === "purchase_orders" ? "Purchase" : "SalesReceipt"
  const baseWhere = [
    startDate ? `TxnDate >= '${startDate}'` : "",
    endDate ? `TxnDate <= '${endDate}'` : "",
  ]
    .filter(Boolean)
    .join(" AND ")
  const salesQuery = `select * from ${salesType}${baseWhere ? ` where ${baseWhere}` : ""}`
  const salesDocs = await queryQuickBooksAll({ realmId, accessToken, query: salesQuery })
  const itemDocs = await queryQuickBooksAll({ realmId, accessToken, query: "select * from Item" })
  const itemsById = new Map<string, Record<string, unknown>>()
  const inventoryRows: InventorySnapshotRow[] = []

  itemDocs.forEach((item) => {
    const itemId = sanitizeText(item.Id)
    if (!itemId) return
    itemsById.set(itemId, item)
    const sku = sanitizeText(item.Sku) || sanitizeText(item.Name)
    const qtyOnHand = toFiniteNumber(item.QtyOnHand)
    if (sku && qtyOnHand !== null) {
      inventoryRows.push({
        sku,
        store: realmId,
        onHand: qtyOnHand,
        asOfDate: endDate || new Date().toISOString().slice(0, 10),
      })
    }
  })

  const rows: CanonicalForecastRow[] = []
  for (const doc of salesDocs) {
    const date = toIsoDate(sanitizeText(doc.TxnDate) || sanitizeText(doc.DueDate))
    if (!date) continue
    const lines = Array.isArray(doc.Line) ? (doc.Line as Array<Record<string, unknown>>) : []
    for (const line of lines) {
      const salesDetail =
        typeof line.SalesItemLineDetail === "object" && line.SalesItemLineDetail
          ? (line.SalesItemLineDetail as Record<string, unknown>)
          : typeof line.ItemBasedExpenseLineDetail === "object" && line.ItemBasedExpenseLineDetail
            ? (line.ItemBasedExpenseLineDetail as Record<string, unknown>)
            : null
      const itemRef = typeof salesDetail?.ItemRef === "object" && salesDetail?.ItemRef
        ? (salesDetail.ItemRef as Record<string, unknown>)
        : null
      const itemId = sanitizeText(itemRef?.value)
      const itemDoc = itemsById.get(itemId)
      const sku =
        sanitizeText(itemDoc?.Sku) ||
        sanitizeText(itemDoc?.Name) ||
        sanitizeText(itemRef?.name) ||
        itemId
      const quantity = toFiniteNumber(salesDetail?.Qty) ?? 1
      const amount = toFiniteNumber(line.Amount)
      const unitPrice = toFiniteNumber(salesDetail?.UnitPrice) ?? (amount !== null ? amount / Math.max(quantity, 1) : null)
      if (!sku || quantity <= 0) continue
      rows.push({
        date,
        sku,
        store: sanitizeText((doc.DepartmentRef as Record<string, unknown> | undefined)?.name) || realmId,
        sales: quantity,
        price: unitPrice,
        on_hand: toFiniteNumber(itemDoc?.QtyOnHand),
      })
    }
  }

  return {
    rows: filterRowsByRange(rows, startDate, endDate),
    inventoryRows,
    reachableTables: unique([salesEntity, "items"]),
    grantedScopes: (process.env.QUICKBOOKS_SCOPES || "com.intuit.quickbooks.accounting")
      .split(" ")
      .map((item) => item.trim())
      .filter(Boolean),
  }
}

const fetchBigCommerceOrders = async ({
  base,
  accessToken,
}: {
  base: string
  accessToken: string
}) => {
  const items: Record<string, unknown>[] = []
  for (let page = 1; page <= 50; page += 1) {
    const response = await fetch(`${base}/v2/orders?limit=250&page=${page}`, {
      method: "GET",
      headers: {
        "X-Auth-Token": accessToken,
        Accept: "application/json",
      },
      cache: "no-store",
    })
    if (!response.ok) {
      throw new Error(`bigcommerce_orders_failed_${response.status}`)
    }
    const pageItems = (await response.json()) as Record<string, unknown>[]
    items.push(...pageItems)
    if (pageItems.length < 250) break
  }
  return items
}

const fetchBigCommerceVariants = async ({
  base,
  accessToken,
}: {
  base: string
  accessToken: string
}) => {
  const items: Record<string, unknown>[] = []
  for (let page = 1; page <= 50; page += 1) {
    const response = await fetch(`${base}/v3/catalog/variants?limit=250&page=${page}`, {
      method: "GET",
      headers: {
        "X-Auth-Token": accessToken,
        Accept: "application/json",
      },
      cache: "no-store",
    })
    if (!response.ok) break
    const payload = (await response.json()) as { data?: Record<string, unknown>[] }
    const pageItems = payload.data || []
    items.push(...pageItems)
    if (pageItems.length < 250) break
  }
  return items
}

const extractBigCommerce = async ({
  source,
  secretEntry,
}: {
  source: DataSourceRecord
  secretEntry: SecretEntry
}): Promise<ExtractionPayload> => {
  const context = sanitizeText(secretEntry?.context)
  const accessToken = await decryptSecret(secretEntry?.accessToken)
  if (!context || !accessToken) {
    throw new Error("missing_bigcommerce_credentials")
  }
  const base = `https://api.bigcommerce.com/${context}`
  const startDate = source.sourceConfig?.historicalStartDate || ""
  const endDate = source.sourceConfig?.historicalEndDate || ""
  const orderDateField = source.sourceConfig?.orderDateField || "date_created"
  const orders = await fetchBigCommerceOrders({ base, accessToken })
  const variants = await fetchBigCommerceVariants({ base, accessToken })
  const inventoryBySku = new Map<string, number>()
  variants.forEach((variant) => {
    const sku = sanitizeText(variant.sku)
    const inventoryLevel = toFiniteNumber(variant.inventory_level)
    if (sku && inventoryLevel !== null) inventoryBySku.set(sku, inventoryLevel)
  })

  const rows: CanonicalForecastRow[] = []
  for (const order of orders) {
    const date = toIsoDate(sanitizeText(order[orderDateField]))
    if (!date || (startDate && date < startDate) || (endDate && date > endDate)) continue
    const orderId = sanitizeText(order.id)
    if (!orderId) continue
    const productsResponse = await fetch(`${base}/v2/orders/${orderId}/products`, {
      method: "GET",
      headers: {
        "X-Auth-Token": accessToken,
        Accept: "application/json",
      },
      cache: "no-store",
    })
    if (!productsResponse.ok) continue
    const products = (await productsResponse.json()) as Record<string, unknown>[]
    for (const product of products) {
      const sku = sanitizeText(product.sku) || sanitizeText(product.product_sku) || sanitizeText(product.name)
      const quantity = toFiniteNumber(product.quantity)
      if (!sku || quantity === null || quantity <= 0) continue
      rows.push({
        date,
        sku,
        store: source.accountId || source.accountName || context,
        sales: quantity,
        price: toFiniteNumber(product.price_ex_tax) ?? toFiniteNumber(product.base_price),
        on_hand: inventoryBySku.get(sku) ?? null,
      })
    }
  }

  const inventoryRows: InventorySnapshotRow[] = Array.from(inventoryBySku.entries()).map(([sku, onHand]) => ({
    sku,
    store: source.accountId || source.accountName || context,
    onHand,
    asOfDate: endDate || new Date().toISOString().slice(0, 10),
  }))

  return {
    rows,
    inventoryRows,
    reachableTables: unique(["orders", ...(inventoryRows.length > 0 ? ["variants", "inventory"] : [])]),
    grantedScopes: sanitizeText(secretEntry?.scope)
      .split(" ")
      .map((item) => item.trim())
      .filter(Boolean),
  }
}

const toHex = (value: string | Buffer) => crypto.createHash("sha256").update(value).digest("hex")
const hmac = (key: Buffer | string, value: string) => crypto.createHmac("sha256", key).update(value).digest()
const encodeRfc3986 = (value: string) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
const canonicalQuery = (params: URLSearchParams) =>
  [...params.entries()]
    .sort(([aKey, aValue], [bKey, bValue]) => (aKey === bKey ? aValue.localeCompare(bValue) : aKey.localeCompare(bKey)))
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .join("&")

const signAndFetchAmazon = async ({
  url,
  accessToken,
  awsAccessKeyId,
  awsSecretAccessKey,
  awsSessionToken,
  region,
}: {
  url: URL
  accessToken: string
  awsAccessKeyId: string
  awsSecretAccessKey: string
  awsSessionToken?: string
  region: string
}) => {
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "")
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = toHex("")
  const host = url.host
  const headers: Record<string, string> = {
    host,
    "x-amz-access-token": accessToken,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  }
  if (awsSessionToken) headers["x-amz-security-token"] = awsSessionToken
  const signedHeaderNames = Object.keys(headers).sort()
  const canonicalHeaders = signedHeaderNames.map((key) => `${key}:${headers[key].trim()}\n`).join("")
  const signedHeaders = signedHeaderNames.join(";")
  const canonicalRequest = ["GET", url.pathname, canonicalQuery(url.searchParams), canonicalHeaders, signedHeaders, payloadHash].join("\n")
  const credentialScope = `${dateStamp}/${region}/execute-api/aws4_request`
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, toHex(canonicalRequest)].join("\n")
  const kDate = hmac(`AWS4${awsSecretAccessKey}`, dateStamp)
  const kRegion = hmac(kDate, region)
  const kService = hmac(kRegion, "execute-api")
  const kSigning = hmac(kService, "aws4_request")
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex")
  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${awsAccessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ")
  return fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: authorization,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      "x-amz-access-token": accessToken,
      ...(awsSessionToken ? { "x-amz-security-token": awsSessionToken } : {}),
    },
    cache: "no-store",
  })
}

const refreshAmazonAccessToken = async (refreshToken: string) => {
  const clientId = process.env.AMAZON_LWA_CLIENT_ID || ""
  const clientSecret = process.env.AMAZON_LWA_CLIENT_SECRET || ""
  if (!clientId || !clientSecret) {
    throw new Error("missing_amazon_credentials")
  }
  const tokenRes = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  })
  if (!tokenRes.ok) throw new Error(`amazon_refresh_failed_${tokenRes.status}`)
  const payload = (await tokenRes.json()) as { access_token?: string }
  if (!payload.access_token) throw new Error("amazon_refresh_failed")
  return payload.access_token
}

const extractAmazon = async ({
  source,
  secretEntry,
}: {
  source: DataSourceRecord
  secretEntry: SecretEntry
}): Promise<ExtractionPayload> => {
  const refreshToken = await decryptSecret(secretEntry?.refreshToken)
  const sellerId = sanitizeText(secretEntry?.sellingPartnerId)
  if (!refreshToken || !sellerId) {
    throw new Error("missing_amazon_credentials")
  }
  const accessToken = await refreshAmazonAccessToken(refreshToken)
  const awsAccessKeyId = process.env.AMAZON_SP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || ""
  const awsSecretAccessKey = process.env.AMAZON_SP_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || ""
  const awsSessionToken = process.env.AMAZON_SP_AWS_SESSION_TOKEN || process.env.AWS_SESSION_TOKEN || ""
  const baseUrl = process.env.AMAZON_SP_API_BASE_URL || "https://sellingpartnerapi-na.amazon.com"
  const region = process.env.AMAZON_SP_API_REGION || "us-east-1"
  if (!awsAccessKeyId || !awsSecretAccessKey) {
    throw new Error("missing_spapi_config")
  }

  const sellersUrl = new URL("/sellers/v1/marketplaceParticipations", baseUrl)
  const sellersRes = await signAndFetchAmazon({
    url: sellersUrl,
    accessToken,
    awsAccessKeyId,
    awsSecretAccessKey,
    awsSessionToken,
    region,
  })
  if (!sellersRes.ok) {
    throw new Error(`amazon_marketplace_failed_${sellersRes.status}`)
  }
  const sellersPayload = (await sellersRes.json()) as { payload?: Array<{ marketplace?: { id?: string } }> }
  const marketplaceId = sellersPayload.payload?.[0]?.marketplace?.id || ""
  if (!marketplaceId) throw new Error("amazon_marketplace_missing")

  const startDate = source.sourceConfig?.historicalStartDate || ""
  const endDate = source.sourceConfig?.historicalEndDate || ""
  const orders: Record<string, unknown>[] = []
  let nextToken = ""
  do {
    const ordersUrl = new URL("/orders/v0/orders", baseUrl)
    if (nextToken) {
      ordersUrl.searchParams.set("NextToken", nextToken)
    } else {
      ordersUrl.searchParams.set("MarketplaceIds", marketplaceId)
      ordersUrl.searchParams.set("CreatedAfter", `${startDate || "2020-01-01"}T00:00:00Z`)
      if (endDate) ordersUrl.searchParams.set("CreatedBefore", `${endDate}T23:59:59Z`)
      ordersUrl.searchParams.set("MaxResultsPerPage", "100")
    }
    const response = await signAndFetchAmazon({
      url: ordersUrl,
      accessToken,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      region,
    })
    if (!response.ok) throw new Error(`amazon_orders_failed_${response.status}`)
    const payload = (await response.json()) as { payload?: { Orders?: Record<string, unknown>[]; NextToken?: string } }
    orders.push(...(payload.payload?.Orders || []))
    nextToken = payload.payload?.NextToken || ""
  } while (nextToken)

  const inventoryRows: InventorySnapshotRow[] = []
  const inventoryUrl = new URL("/fba/inventory/v1/summaries", baseUrl)
  inventoryUrl.searchParams.set("granularityType", "Marketplace")
  inventoryUrl.searchParams.set("granularityId", marketplaceId)
  inventoryUrl.searchParams.set("marketplaceIds", marketplaceId)
  inventoryUrl.searchParams.set("details", "false")
  const inventoryRes = await signAndFetchAmazon({
    url: inventoryUrl,
    accessToken,
    awsAccessKeyId,
    awsSecretAccessKey,
    awsSessionToken,
    region,
  })
  const inventoryBySku = new Map<string, number>()
  if (inventoryRes.ok) {
    const inventoryPayload = (await inventoryRes.json()) as {
      payload?: { inventorySummaries?: Array<Record<string, unknown>> }
    }
    for (const item of inventoryPayload.payload?.inventorySummaries || []) {
      const sku = sanitizeText(item.sellerSku)
      const totalQuantity = toFiniteNumber(item.totalQuantity)
      if (!sku || totalQuantity === null) continue
      inventoryBySku.set(sku, totalQuantity)
      inventoryRows.push({
        sku,
        store: marketplaceId,
        onHand: totalQuantity,
        asOfDate: endDate || new Date().toISOString().slice(0, 10),
      })
    }
  }

  const rows: CanonicalForecastRow[] = []
  for (const order of orders) {
    const orderId = sanitizeText(order.AmazonOrderId)
    const date = toIsoDate(sanitizeText(order.PurchaseDate))
    if (!orderId || !date) continue
    const itemsUrl = new URL(`/orders/v0/orders/${orderId}/orderItems`, baseUrl)
    const itemsRes = await signAndFetchAmazon({
      url: itemsUrl,
      accessToken,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      region,
    })
    if (!itemsRes.ok) continue
    const payload = (await itemsRes.json()) as { payload?: { OrderItems?: Array<Record<string, unknown>> } }
    for (const item of payload.payload?.OrderItems || []) {
      const sku = sanitizeText(item.SellerSKU) || sanitizeText(item.ASIN)
      const quantity = toFiniteNumber(item.QuantityOrdered)
      const totalPrice = toFiniteNumber((item.ItemPrice as Record<string, unknown> | undefined)?.Amount)
      if (!sku || quantity === null || quantity <= 0) continue
      rows.push({
        date,
        sku,
        store: marketplaceId,
        sales: quantity,
        price: totalPrice !== null ? totalPrice / quantity : null,
        on_hand: inventoryBySku.get(sku) ?? null,
      })
    }
  }

  return {
    rows: filterRowsByRange(rows, startDate, endDate),
    inventoryRows,
    reachableTables: unique(["orders", "order_items", ...(inventoryRows.length > 0 ? ["inventory"] : [])]),
  }
}

const extractOther = async () => {
  throw new Error("custom_adapter_extraction_not_implemented")
}

const extractByProvider = async ({
  source,
  secretEntry,
}: {
  source: DataSourceRecord
  secretEntry: SecretEntry
}) => {
  if (source.provider === "shopify") return extractShopify({ source, secretEntry })
  if (source.provider === "quickbooks") return extractQuickBooks({ source, secretEntry })
  if (source.provider === "bigcommerce") return extractBigCommerce({ source, secretEntry })
  if (source.provider === "amazon") return extractAmazon({ source, secretEntry })
  return extractOther()
}

export const runProviderExtraction = async ({
  tenantId,
  source,
  sourceRunId,
  secretEntry,
  plan,
}: {
  tenantId: string
  source: DataSourceRecord
  sourceRunId: string
  secretEntry: SecretEntry
  plan?: unknown
}) => {
  const extracted = await extractByProvider({ source, secretEntry })
  validateCanonicalRowsForPlan(extracted.rows, normalizeTenantPlan(plan))
  const persisted = await persistExtractionArtifact({
    tenantId,
    source,
    runId: sourceRunId,
    rows: extracted.rows,
    inventoryRows: extracted.inventoryRows,
  })

  const diagnostics = buildSourceDiagnostics({
    provider: source.provider,
    grantedScopes: extracted.grantedScopes || source.diagnostics?.grantedScopes || [],
    reachableTables: extracted.reachableTables,
    availableTables: source.availableTables,
    selectedTables: source.selectedTables,
    statusSummary: "Connected and extraction-ready",
    userMessage: persisted.summaryMessage,
  })

  return {
    artifact: persisted.artifact,
    diagnostics,
    message: persisted.summaryMessage,
  }
}
