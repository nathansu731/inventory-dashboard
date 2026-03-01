import type { DataSourceProvider } from "@/lib/data-sources"

type ProviderCatalogEntry = {
  objects: string[]
  defaultSelected: string[]
}

const DATA_SOURCE_CATALOG: Record<DataSourceProvider, ProviderCatalogEntry> = {
  shopify: {
    objects: [],
    defaultSelected: [],
  },
  amazon: {
    objects: [],
    defaultSelected: [],
  },
  quickbooks: {
    objects: [],
    defaultSelected: [],
  },
  bigcommerce: {
    objects: [],
    defaultSelected: [],
  },
  other: {
    objects: [],
    defaultSelected: [],
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
