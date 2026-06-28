import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import React from "react"
import type { ConnectorProvider, ConnectorState } from "@/components/data-input-page/data-source-selection"
import type { DataSourceDiagnostics } from "@/lib/data-sources"
import {
  PROVIDER_DATE_FIELD_OPTIONS,
  PROVIDER_SKU_STRATEGY_OPTIONS,
  type ProviderBlueprint,
  type ProviderSetupConfig,
} from "@/lib/provider-source-config"

type ConnectorImportSetupSectionProps = {
  provider: ConnectorProvider
  blueprint: ProviderBlueprint | null
  diagnostics: DataSourceDiagnostics | null
  connectionState: ConnectorState
  canManageSources: boolean
  availableTables: string[]
  selectedTables: string[]
  setSelectedTables: React.Dispatch<React.SetStateAction<string[]>>
  effectiveSelectedTables: string[]
  sourceConfig: ProviderSetupConfig
  setSourceConfig: React.Dispatch<React.SetStateAction<ProviderSetupConfig>>
  syncMode: string
  setSyncMode: React.Dispatch<React.SetStateAction<string>>
  lastImportAt: string | null
  nextImportAt: string | null
  retryCount: number
  lastError: string | null
}

const providerLabel = (provider: ConnectorProvider) => {
  if (provider === "csv") return "CSV"
  if (provider === "shopify") return "Shopify"
  if (provider === "amazon") return "Amazon"
  if (provider === "quickbooks") return "QuickBooks"
  if (provider === "bigcommerce") return "BigCommerce"
  return "Other"
}

const formatDateTime = (value: string | null) => {
  if (!value) return "Not available"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

const buildCompatibility = ({
  isConnected,
  sourceConfig,
  diagnostics,
  effectiveSelectedTables,
}: {
  isConnected: boolean
  sourceConfig: ProviderSetupConfig
  diagnostics: DataSourceDiagnostics | null
  effectiveSelectedTables: string[]
}) => {
  const blockers: string[] = []
  const warnings: string[] = []
  const missingReachable = diagnostics?.missingTables || []

  if (!isConnected) blockers.push("Connect the provider before saving or importing.")
  if (!sourceConfig.salesEntity) blockers.push("Choose the primary sales entity.")
  if (!sourceConfig.catalogEntity) warnings.push("Choose a catalog entity to improve SKU normalization.")
  if (sourceConfig.historicalStartDate && sourceConfig.historicalEndDate && sourceConfig.historicalStartDate > sourceConfig.historicalEndDate) {
    blockers.push("Historical start date must be on or before the end date.")
  }
  if (missingReachable.length > 0) {
    warnings.push(`Some selected entities are not reachable yet: ${missingReachable.join(", ")}.`)
  }
  if (diagnostics?.blockingIssues?.length) {
    blockers.push(...diagnostics.blockingIssues)
  }
  if (effectiveSelectedTables.length === 0) {
    blockers.push("Select at least one entity to extract.")
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
  }
}

export const ConnectorImportSetupSection = ({
  provider,
  blueprint,
  diagnostics,
  connectionState,
  canManageSources,
  availableTables,
  selectedTables,
  setSelectedTables,
  effectiveSelectedTables,
  sourceConfig,
  setSourceConfig,
  syncMode,
  setSyncMode,
  lastImportAt,
  nextImportAt,
  retryCount,
  lastError,
}: ConnectorImportSetupSectionProps) => {
  const isConnected = connectionState === "connected"
  const providerKey = provider === "csv" ? "other" : provider
  const dateFieldOptions = PROVIDER_DATE_FIELD_OPTIONS[providerKey] || PROVIDER_DATE_FIELD_OPTIONS.other
  const skuStrategyOptions = PROVIDER_SKU_STRATEGY_OPTIONS[providerKey] || PROVIDER_SKU_STRATEGY_OPTIONS.other
  const compatibility = buildCompatibility({ isConnected, sourceConfig, diagnostics, effectiveSelectedTables })
  const reachableTables = diagnostics?.reachableTables || []
  const missingTables = diagnostics?.missingTables || []

  const updateSourceConfig = <K extends keyof ProviderSetupConfig>(key: K, value: ProviderSetupConfig[K]) => {
    setSourceConfig((prev) => ({ ...prev, [key]: value }))
  }

  const toggleTable = (tableName: string, checked: boolean) => {
    if (checked) {
      setSelectedTables((prev) => (prev.includes(tableName) ? prev : [...prev, tableName]))
      return
    }
    setSelectedTables((prev) => prev.filter((item) => item !== tableName))
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Connector Import Setup</div>
          <div className="text-xs text-muted-foreground">
            Configure the extraction recipe for {providerLabel(provider)} so imported data matches the same forecast-ready shape as the CSV flow.
          </div>
        </div>
        <Badge variant={compatibility.ready ? "secondary" : "outline"}>
          {compatibility.ready ? "Ready to import" : "Needs setup"}
        </Badge>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Sales entity</Label>
              <Select
                value={sourceConfig.salesEntity || "__empty__"}
                onValueChange={(value) => updateSourceConfig("salesEntity", value === "__empty__" ? "" : value)}
                disabled={!canManageSources}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sales entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">Select sales entity</SelectItem>
                  {availableTables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Catalog entity</Label>
              <Select
                value={sourceConfig.catalogEntity || "__empty__"}
                onValueChange={(value) => updateSourceConfig("catalogEntity", value === "__empty__" ? "" : value)}
                disabled={!canManageSources}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select catalog entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">Skip for now</SelectItem>
                  {availableTables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Inventory entity</Label>
              <Select
                value={sourceConfig.inventoryEntity || "__empty__"}
                onValueChange={(value) => updateSourceConfig("inventoryEntity", value === "__empty__" ? "" : value)}
                disabled={!canManageSources}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select inventory entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">Skip for now</SelectItem>
                  {availableTables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Historical start date</Label>
              <Input
                type="date"
                value={sourceConfig.historicalStartDate}
                onChange={(event) => updateSourceConfig("historicalStartDate", event.target.value)}
                disabled={!canManageSources}
              />
            </div>
            <div className="space-y-2">
              <Label>Historical end date</Label>
              <Input
                type="date"
                value={sourceConfig.historicalEndDate}
                onChange={(event) => updateSourceConfig("historicalEndDate", event.target.value)}
                disabled={!canManageSources}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Date field strategy</Label>
              <Select
                value={sourceConfig.orderDateField}
                onValueChange={(value) => updateSourceConfig("orderDateField", value)}
                disabled={!canManageSources}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose date field" />
                </SelectTrigger>
                <SelectContent>
                  {dateFieldOptions.map((option: (typeof dateFieldOptions)[number]) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                {dateFieldOptions.find((option: (typeof dateFieldOptions)[number]) => option.value === sourceConfig.orderDateField)?.description || "Choose the date field that best represents realized demand."}
              </div>
            </div>

            <div className="space-y-2">
              <Label>SKU key strategy</Label>
              <Select
                value={sourceConfig.skuStrategy}
                onValueChange={(value) => updateSourceConfig("skuStrategy", value)}
                disabled={!canManageSources}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose SKU strategy" />
                </SelectTrigger>
                <SelectContent>
                  {skuStrategyOptions.map((option: (typeof skuStrategyOptions)[number]) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                {skuStrategyOptions.find((option: (typeof skuStrategyOptions)[number]) => option.value === sourceConfig.skuStrategy)?.description || "Pick the field that most reliably identifies the forecasted item."}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
            <div className="space-y-2">
              <Label>Compatibility notes / overrides</Label>
              <Textarea
                value={sourceConfig.compatibilityOverrideNotes || ""}
                onChange={(event) => updateSourceConfig("compatibilityOverrideNotes", event.target.value)}
                disabled={!canManageSources}
                placeholder="Optional notes about refunds, custom mappings, or any provider-specific caveats."
                className="min-h-[88px]"
              />
            </div>
            <div className="flex items-center gap-3 rounded-md border p-3">
              <Switch
                checked={sourceConfig.includeCancelled}
                onCheckedChange={(checked) => updateSourceConfig("includeCancelled", checked)}
                disabled={!canManageSources}
              />
              <div>
                <div className="text-sm font-medium">Include cancelled / refunded orders</div>
                <div className="text-xs text-muted-foreground">Turn on only if you intentionally want gross order volume instead of realized demand.</div>
              </div>
            </div>
          </div>

          <div className="rounded-md border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Additional entities</div>
                <div className="text-xs text-muted-foreground">Select any extra objects needed for diagnostics, enrichment, or downstream inventory context.</div>
              </div>
              <Badge variant="outline">{effectiveSelectedTables.length} selected</Badge>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {availableTables.length > 0 ? (
                availableTables.map((tableName) => (
                  <label key={tableName} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <Checkbox
                      checked={selectedTables.includes(tableName) || [
                        sourceConfig.salesEntity,
                        sourceConfig.catalogEntity,
                        sourceConfig.inventoryEntity,
                      ].includes(tableName)}
                      onCheckedChange={(checked) => toggleTable(tableName, checked === true)}
                      disabled={!canManageSources}
                    />
                    <span>{tableName}</span>
                  </label>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No provider objects discovered yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/20 p-3">
            <div className="text-sm font-medium">Compatibility status</div>
            <div className="mt-2">
              {compatibility.ready ? (
                <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  This setup is compatible with the forecast import flow. Next step is saving the configuration and running an import.
                </div>
              ) : (
                <div className="space-y-2">
                  {compatibility.blockers.map((item) => (
                    <div key={item} className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {compatibility.warnings.length > 0 && (
              <div className="mt-3 space-y-2">
                {compatibility.warnings.map((item) => (
                  <div key={item} className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-md border p-3">
            <div className="text-sm font-medium">Forecast extraction mapping</div>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">Demand history</span>
                <span className="font-medium">{sourceConfig.salesEntity || "Not selected"}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">SKU enrichment</span>
                <span className="font-medium">{sourceConfig.catalogEntity || "Not selected"}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">Inventory source</span>
                <span className="font-medium">{sourceConfig.inventoryEntity || "Optional / not selected"}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">Date field</span>
                <span className="font-medium">{sourceConfig.orderDateField}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">SKU strategy</span>
                <span className="font-medium">{sourceConfig.skuStrategy}</span>
              </div>
            </div>
          </div>

          <div className="rounded-md border p-3">
            <div className="text-sm font-medium">Permissions and discovery</div>
            <div className="mt-3 space-y-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Reachable entities</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {reachableTables.length > 0 ? (
                    reachableTables.map((table) => (
                      <Badge key={table} variant="secondary">
                        {table}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No provider entities discovered yet.</span>
                  )}
                </div>
              </div>

              {missingTables.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Missing or blocked entities</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {missingTables.map((table) => (
                      <Badge key={table} variant="outline">
                        {table}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {blueprint?.forecastFields?.length ? (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Canonical output target</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {blueprint.forecastFields.map((field) => (
                      <Badge key={field} variant="outline">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-1 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            <div>Last import: {formatDateTime(lastImportAt)}</div>
            <div>Next import: {formatDateTime(nextImportAt)}</div>
            <div>Retry count: {retryCount}</div>
            {lastError && <div className="text-red-700">Last error: {lastError}</div>}
          </div>

          <div className="space-y-2">
            <Label>Import schedule</Label>
            <Select value={syncMode} onValueChange={setSyncMode} disabled={!isConnected || !canManageSources}>
              <SelectTrigger>
                <SelectValue placeholder="Select sync mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual only</SelectItem>
                <SelectItem value="every-6h">Every 6 hours</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">The schedule governs when credential validation and future imports should run after initial setup.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
