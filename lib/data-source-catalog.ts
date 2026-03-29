import type { DataSourceProvider } from "@/lib/data-sources"

type ProviderCatalogEntry = {
  objects: string[]
  defaultSelected: string[]
}

const DATA_SOURCE_CATALOG: Record<DataSourceProvider, ProviderCatalogEntry> = {
  shopify: {
    objects: ["orders", "products", "customers", "inventory_levels"],
    defaultSelected: ["orders", "products"],
  },
  amazon: {
    objects: ["orders", "order_items", "inventory"],
    defaultSelected: ["orders", "order_items"],
  },
  quickbooks: {
    objects: ["invoices", "sales_receipts", "items", "customers", "purchase_orders"],
    defaultSelected: ["invoices", "items"],
  },
  bigcommerce: {
    objects: ["orders", "products", "variants", "customers", "inventory"],
    defaultSelected: ["orders", "products"],
  },
  other: {
    objects: ["orders", "products", "customers", "inventory"],
    defaultSelected: ["orders"],
  },
}

const unique = (items: string[]) => Array.from(new Set(items))

export const getDataSourceCatalog = () => DATA_SOURCE_CATALOG

export const getProviderObjects = (provider: DataSourceProvider) => {
  const entry = DATA_SOURCE_CATALOG[provider] || DATA_SOURCE_CATALOG.other
  return [...entry.objects]
}

export const getDefaultSelectedObjects = (provider: DataSourceProvider) => {
  const entry = DATA_SOURCE_CATALOG[provider] || DATA_SOURCE_CATALOG.other
  return [...entry.defaultSelected]
}

export const sanitizeSelectedObjects = (provider: DataSourceProvider, value: unknown) => {
  const allowed = new Set(getProviderObjects(provider))
  const source = Array.isArray(value) ? value : []
  const selected = unique(
    source
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item && allowed.has(item))
  )

  return selected.length > 0 ? selected : getDefaultSelectedObjects(provider)
}

export const sanitizeAvailableObjects = (provider: DataSourceProvider, value: unknown) => {
  const allowed = new Set(getProviderObjects(provider))
  const source = Array.isArray(value) ? value : []
  const normalized = unique(
    source
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item && allowed.has(item))
  )
  return normalized.length > 0 ? normalized : getProviderObjects(provider)
}
