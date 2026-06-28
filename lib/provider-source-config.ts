import type { DataSourceProvider } from "@/lib/data-sources"

export type ProviderSetupConfig = {
  historicalStartDate: string
  historicalEndDate: string
  salesEntity: string
  catalogEntity: string
  inventoryEntity: string
  orderDateField: string
  skuStrategy: string
  includeCancelled: boolean
  compatibilityOverrideNotes?: string
}

export type ProviderBlueprint = {
  provider: DataSourceProvider
  label: string
  authStyle: string
  description: string
  connectionSteps: string[]
  requiredEntities: string[]
  optionalEntities: string[]
  recommendedDefaults: Partial<ProviderSetupConfig>
  forecastFields: string[]
  notes: string[]
}

export type ProviderOption = {
  value: string
  label: string
  description?: string
}

const defaultDateStart = () => {
  const date = new Date()
  date.setUTCFullYear(date.getUTCFullYear() - 1)
  return date.toISOString().slice(0, 10)
}

const defaultDateEnd = () => new Date().toISOString().slice(0, 10)

export const defaultProviderSetupConfig = (provider: DataSourceProvider): ProviderSetupConfig => {
  const base: ProviderSetupConfig = {
    historicalStartDate: defaultDateStart(),
    historicalEndDate: defaultDateEnd(),
    salesEntity: "",
    catalogEntity: "",
    inventoryEntity: "",
    orderDateField: "processed_at",
    skuStrategy: "sku",
    includeCancelled: false,
  }

  if (provider === "shopify") {
    return {
      ...base,
      salesEntity: "orders",
      catalogEntity: "products",
      inventoryEntity: "inventory_levels",
      orderDateField: "processed_at",
      skuStrategy: "variant_sku",
    }
  }
  if (provider === "quickbooks") {
    return {
      ...base,
      salesEntity: "sales_receipts",
      catalogEntity: "items",
      inventoryEntity: "items",
      orderDateField: "txn_date",
      skuStrategy: "item_sku",
    }
  }
  if (provider === "bigcommerce") {
    return {
      ...base,
      salesEntity: "orders",
      catalogEntity: "products",
      inventoryEntity: "inventory",
      orderDateField: "date_created",
      skuStrategy: "variant_sku",
    }
  }
  if (provider === "amazon") {
    return {
      ...base,
      salesEntity: "orders",
      catalogEntity: "order_items",
      inventoryEntity: "inventory",
      orderDateField: "purchase_date",
      skuStrategy: "seller_sku",
    }
  }
  return {
    ...base,
    salesEntity: "orders",
    catalogEntity: "products",
    inventoryEntity: "inventory",
    orderDateField: "date",
    skuStrategy: "sku",
  }
}

export const PROVIDER_BLUEPRINTS: Record<DataSourceProvider, ProviderBlueprint> = {
  shopify: {
    provider: "shopify",
    label: "Shopify",
    authStyle: "Store OAuth install",
    description: "Connect a Shopify store through app installation and Admin API access scopes.",
    connectionSteps: [
      "Enter the store's `myshopify.com` domain.",
      "The merchant installs the app and grants Admin API scopes.",
      "The app validates granted scopes, then checks orders, products, and inventory endpoints.",
    ],
    requiredEntities: ["orders", "products"],
    optionalEntities: ["customers", "inventory_levels"],
    recommendedDefaults: {
      salesEntity: "orders",
      catalogEntity: "products",
      inventoryEntity: "inventory_levels",
      orderDateField: "processed_at",
      skuStrategy: "variant_sku",
    },
    forecastFields: ["date", "sku", "store/location", "quantity", "price", "on_hand"],
    notes: [
      "Orders plus line items are the main sales history source.",
      "Inventory requires the relevant inventory scopes and location coverage.",
    ],
  },
  quickbooks: {
    provider: "quickbooks",
    label: "QuickBooks",
    authStyle: "Intuit OAuth 2.0",
    description: "Connect a QuickBooks Online company using the accounting scope and company realm access.",
    connectionSteps: [
      "The user authorizes the app with QuickBooks Online Accounting scope.",
      "The callback returns the company `realmId` used for subsequent API requests.",
      "The app validates company access and tests accounting entities that can produce forecast data.",
    ],
    requiredEntities: ["sales_receipts", "items"],
    optionalEntities: ["invoices", "customers", "purchase_orders"],
    recommendedDefaults: {
      salesEntity: "sales_receipts",
      catalogEntity: "items",
      inventoryEntity: "items",
      orderDateField: "txn_date",
      skuStrategy: "item_sku",
    },
    forecastFields: ["date", "sku", "store/location", "quantity", "price", "on_hand"],
    notes: [
      "Sales receipts are usually cleaner than invoices for retail demand history.",
      "Inventory availability depends on item quantity tracking in QuickBooks.",
    ],
  },
  bigcommerce: {
    provider: "bigcommerce",
    label: "BigCommerce",
    authStyle: "BigCommerce app OAuth",
    description: "Connect a BigCommerce store using app installation and long-lived store access.",
    connectionSteps: [
      "The merchant installs the app and authorizes store access.",
      "The callback returns store `context` and granted scopes.",
      "The app validates accessible orders, catalog, and inventory endpoints before sync.",
    ],
    requiredEntities: ["orders", "products"],
    optionalEntities: ["variants", "customers", "inventory"],
    recommendedDefaults: {
      salesEntity: "orders",
      catalogEntity: "products",
      inventoryEntity: "inventory",
      orderDateField: "date_created",
      skuStrategy: "variant_sku",
    },
    forecastFields: ["date", "sku", "store/location", "quantity", "price", "on_hand"],
    notes: [
      "Variant-level SKU coverage is usually required for clean forecast granularity.",
      "Inventory coverage can differ by catalog and inventory API permissions.",
    ],
  },
  amazon: {
    provider: "amazon",
    label: "Amazon Seller Central",
    authStyle: "Selling Partner Appstore consent",
    description: "Connect a Seller Central account using SP-API consent, LWA tokens, and AWS request signing.",
    connectionSteps: [
      "The seller grants consent in Seller Central.",
      "The app exchanges the returned code for an LWA refresh token.",
      "The app validates market participation, then tests orders and inventory endpoints using signed SP-API requests.",
    ],
    requiredEntities: ["orders", "order_items"],
    optionalEntities: ["inventory"],
    recommendedDefaults: {
      salesEntity: "orders",
      catalogEntity: "order_items",
      inventoryEntity: "inventory",
      orderDateField: "purchase_date",
      skuStrategy: "seller_sku",
    },
    forecastFields: ["date", "sku", "store/location", "quantity", "price", "on_hand"],
    notes: [
      "Marketplace and fulfillment channel selection materially affect available data.",
      "Inventory coverage depends on marketplace participation and SP-API permissions.",
    ],
  },
  other: {
    provider: "other",
    label: "Other",
    authStyle: "Custom adapter",
    description: "Map a generic CSV or REST source into the forecast schema used by the app.",
    connectionSteps: [
      "Choose an adapter template or define custom field mapping.",
      "Select the entities or endpoints that represent sales, catalog, and inventory.",
      "Validate extracted sample rows against the canonical forecast schema before sync.",
    ],
    requiredEntities: ["orders"],
    optionalEntities: ["products", "customers", "inventory"],
    recommendedDefaults: {
      salesEntity: "orders",
      catalogEntity: "products",
      inventoryEntity: "inventory",
      orderDateField: "date",
      skuStrategy: "sku",
    },
    forecastFields: ["date", "sku", "store/location", "quantity", "price", "on_hand"],
    notes: [
      "The more explicit the field mapping, the less cleanup is needed later.",
    ],
  },
}

export const PROVIDER_DATE_FIELD_OPTIONS: Record<DataSourceProvider, ProviderOption[]> = {
  shopify: [
    { value: "processed_at", label: "Processed Date", description: "Best for completed retail demand history." },
    { value: "created_at", label: "Order Created Date", description: "Use when fulfillment timing is less important." },
    { value: "updated_at", label: "Order Updated Date", description: "Useful only for custom operational reporting." },
  ],
  quickbooks: [
    { value: "txn_date", label: "Transaction Date", description: "Preferred for invoices and sales receipts." },
    { value: "due_date", label: "Due Date", description: "Only use if invoice due timing drives planning." },
  ],
  bigcommerce: [
    { value: "date_created", label: "Order Created Date", description: "Recommended default for sales extraction." },
    { value: "date_modified", label: "Order Modified Date", description: "Use only if order edits matter operationally." },
  ],
  amazon: [
    { value: "purchase_date", label: "Purchase Date", description: "Recommended for Seller Central demand history." },
    { value: "last_update_date", label: "Last Update Date", description: "Use only when operational changes matter." },
  ],
  other: [
    { value: "date", label: "Date", description: "Canonical date field for generic adapters." },
    { value: "created_at", label: "Created At", description: "Common API timestamp field." },
  ],
}

export const PROVIDER_SKU_STRATEGY_OPTIONS: Record<DataSourceProvider, ProviderOption[]> = {
  shopify: [
    { value: "variant_sku", label: "Variant SKU", description: "Recommended for SKU-level forecasting." },
    { value: "product_sku", label: "Product SKU", description: "Use only if variants are not maintained cleanly." },
  ],
  quickbooks: [
    { value: "item_sku", label: "Item / SKU", description: "Preferred when items are uniquely maintained." },
    { value: "item_name", label: "Item Name", description: "Fallback when SKU codes are incomplete." },
  ],
  bigcommerce: [
    { value: "variant_sku", label: "Variant SKU", description: "Recommended for store catalog granularity." },
    { value: "product_sku", label: "Product SKU", description: "Fallback when variants are not used." },
  ],
  amazon: [
    { value: "seller_sku", label: "Seller SKU", description: "Recommended for marketplace-level planning." },
    { value: "asin", label: "ASIN", description: "Use only when seller SKUs are unstable." },
  ],
  other: [
    { value: "sku", label: "SKU", description: "Canonical stock keeping unit." },
    { value: "product_code", label: "Product Code", description: "Fallback when SKU is named differently." },
  ],
}

export const getProviderBlueprint = (provider: DataSourceProvider) => PROVIDER_BLUEPRINTS[provider] || PROVIDER_BLUEPRINTS.other

const sanitizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "")

export const normalizeProviderSetupConfig = (
  provider: DataSourceProvider,
  value: unknown
): ProviderSetupConfig => {
  const defaults = defaultProviderSetupConfig(provider)
  const input = typeof value === "object" && value ? (value as Record<string, unknown>) : {}
  return {
    historicalStartDate: sanitizeText(input.historicalStartDate) || defaults.historicalStartDate,
    historicalEndDate: sanitizeText(input.historicalEndDate) || defaults.historicalEndDate,
    salesEntity: sanitizeText(input.salesEntity) || defaults.salesEntity,
    catalogEntity: sanitizeText(input.catalogEntity) || defaults.catalogEntity,
    inventoryEntity: sanitizeText(input.inventoryEntity) || defaults.inventoryEntity,
    orderDateField: sanitizeText(input.orderDateField) || defaults.orderDateField,
    skuStrategy: sanitizeText(input.skuStrategy) || defaults.skuStrategy,
    includeCancelled: input.includeCancelled === true,
    compatibilityOverrideNotes: sanitizeText(input.compatibilityOverrideNotes) || undefined,
  }
}
