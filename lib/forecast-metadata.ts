export type ForecastMetadataEntry = {
  sku?: string
  store?: string
  skuDesc?: string
  forecastMethod?: string
  ABCclass?: string
  ABCpercentage?: number
  isApproved?: boolean
}

export const buildForecastSeriesKey = (sku?: string | null, store?: string | null) =>
  `${String(sku || "").trim()}::${String(store || "").trim()}`

export const getForecastMetadata = <T extends ForecastMetadataEntry>(
  metadata: Record<string, T>,
  sku?: string | null,
  store?: string | null
): T | undefined => {
  const composite = buildForecastSeriesKey(sku, store)
  if (composite in metadata) return metadata[composite]
  if (sku && sku in metadata) return metadata[sku]
  return undefined
}

export const getForecastMetadataDisplaySku = <T extends ForecastMetadataEntry>(
  key: string,
  value: T
) => {
  const sku = typeof value?.sku === "string" && value.sku.trim() ? value.sku.trim() : ""
  return sku || key.split("::")[0] || key
}

export const getForecastMetadataDisplayStore = <T extends ForecastMetadataEntry>(
  key: string,
  value: T
) => {
  const store = typeof value?.store === "string" && value.store.trim() ? value.store.trim() : ""
  return store || key.split("::")[1] || "Unknown"
}
