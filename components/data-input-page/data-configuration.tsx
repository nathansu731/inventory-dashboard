import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type React from "react"
import type { ConnectorProvider, ConnectorState } from "@/components/data-input-page/data-source-selection"
import type { AdapterTemplate, DataSourceAdapterConfig } from "@/lib/data-source-adapters"

type DataConfigurationProps = {
  plan: string
  model: string
  setModel: React.Dispatch<React.SetStateAction<string>>
  mode: string
  setMode: React.Dispatch<React.SetStateAction<string>>
  seasonality: string
  setSeasonality: React.Dispatch<React.SetStateAction<string>>
  availableModels: string[]
  allowGlobal: boolean
  provider: ConnectorProvider
  connectionState: ConnectorState
  availableTables: string[]
  selectedTables: string[]
  setSelectedTables: React.Dispatch<React.SetStateAction<string[]>>
  syncMode: string
  setSyncMode: React.Dispatch<React.SetStateAction<string>>
  syncStartDate: string
  setSyncStartDate: React.Dispatch<React.SetStateAction<string>>
  lastImportAt: string | null
  nextImportAt: string | null
  retryCount: number
  lastError: string | null
  canManageSources: boolean
  adapterTemplates: AdapterTemplate[]
  adapterConfig: DataSourceAdapterConfig | null
  setAdapterConfig: React.Dispatch<React.SetStateAction<DataSourceAdapterConfig | null>>
}

const providerLabel = (provider: ConnectorProvider) => {
  if (provider === "shopify") return "Shopify"
  if (provider === "amazon") return "Amazon"
  if (provider === "quickbooks") return "QuickBooks"
  if (provider === "bigcommerce") return "BigCommerce"
  return "Other"
}

export const DataConfiguration = ({
  plan,
  model,
  setModel,
  mode,
  setMode,
  seasonality,
  setSeasonality,
  availableModels,
  allowGlobal,
  provider,
  connectionState,
  availableTables,
  selectedTables,
  setSelectedTables,
  syncMode,
  setSyncMode,
  syncStartDate,
  setSyncStartDate,
  lastImportAt,
  nextImportAt,
  retryCount,
  lastError,
  canManageSources,
  adapterTemplates,
  adapterConfig,
  setAdapterConfig,
}: DataConfigurationProps) => {
  const isConnected = connectionState === "connected"

  const toggleTable = (tableName: string, checked: boolean) => {
    if (checked) {
      setSelectedTables((prev) => (prev.includes(tableName) ? prev : [...prev, tableName]))
      return
    }
    setSelectedTables((prev) => prev.filter((item) => item !== tableName))
  }

  const formatDateTime = (value: string | null) => {
    if (!value) return "Not available"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  const setMappingField = (key: string, value: string) => {
    setAdapterConfig((prev) => {
      const next: DataSourceAdapterConfig = prev || {
        templateId: "csv-basic",
        kind: "csv",
        fileDelimiter: ",",
        authType: "none",
        columnMapping: {},
        updatedAt: new Date().toISOString(),
      }
      return {
        ...next,
        columnMapping: {
          ...next.columnMapping,
          [key]: value.trim(),
        },
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Data Configuration
        </CardTitle>
        <CardDescription>Set connector import options and forecasting parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Connector Import Setup</div>
              <div className="text-xs text-muted-foreground">
                Configure sync for {providerLabel(provider)} once connected.
              </div>
            </div>
            <Badge variant={isConnected ? "secondary" : "outline"}>
              {isConnected ? "Connected" : "Not connected"}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tables / Objects to import</Label>
              <div className="max-h-36 space-y-2 overflow-auto rounded-md border p-3">
                {availableTables.length > 0 ? (
                  availableTables.map((tableName) => (
                    <label key={tableName} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={selectedTables.includes(tableName)}
                        disabled={!isConnected || !canManageSources}
                        onChange={(event) => toggleTable(tableName, event.target.checked)}
                      />
                      <span>{tableName}</span>
                    </label>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No objects discovered yet for this provider.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
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
              </div>
              <div className="space-y-2">
                <Label>Sync start date</Label>
                <Input
                  type="date"
                  value={syncStartDate}
                  onChange={(event) => setSyncStartDate(event.target.value)}
                  disabled={!isConnected || !canManageSources}
                />
              </div>
              <div className="space-y-1 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                <div>Last import: {formatDateTime(lastImportAt)}</div>
                <div>Next import: {formatDateTime(nextImportAt)}</div>
                <div>Retry count: {retryCount}</div>
                {lastError && <div className="text-red-700">Last error: {lastError}</div>}
              </div>
            </div>
          </div>
        </div>

        {provider === "other" && (
          <div className="rounded-lg border p-4">
            <div className="text-sm font-medium">Adapter Template Kit</div>
            <div className="text-xs text-muted-foreground">
              Configure reusable CSV/API adapter settings for custom systems.
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Template</Label>
                <Select
                  value={adapterConfig?.templateId || ""}
                  onValueChange={(value) => {
                    const selected = adapterTemplates.find((template) => template.id === value)
                    if (!selected) return
                    const sample = (selected.sampleConfig || {}) as Record<string, unknown>
                    setAdapterConfig((prev) => ({
                      templateId: selected.id,
                      kind: selected.kind,
                      endpointUrl: typeof sample.endpointUrl === "string" ? sample.endpointUrl : prev?.endpointUrl,
                      fileDelimiter:
                        sample.fileDelimiter === "," ||
                        sample.fileDelimiter === ";" ||
                        sample.fileDelimiter === "\t" ||
                        sample.fileDelimiter === "|"
                          ? sample.fileDelimiter
                          : prev?.fileDelimiter || ",",
                      authType:
                        sample.authType === "bearer" || sample.authType === "api-key" || sample.authType === "none"
                          ? sample.authType
                          : prev?.authType || "none",
                      authHeaderName:
                        typeof sample.authHeaderName === "string" ? sample.authHeaderName : prev?.authHeaderName,
                      authToken: prev?.authToken,
                      columnMapping:
                        typeof sample.columnMapping === "object" && sample.columnMapping
                          ? (sample.columnMapping as Record<string, string>)
                          : prev?.columnMapping || {},
                      notes: prev?.notes || "",
                      updatedAt: new Date().toISOString(),
                    }))
                  }}
                  disabled={!canManageSources}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select adapter template" />
                  </SelectTrigger>
                  <SelectContent>
                    {adapterTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {adapterConfig?.kind === "api" && (
                <div className="space-y-2">
                  <Label>Endpoint URL</Label>
                  <Input
                    value={adapterConfig?.endpointUrl || ""}
                    onChange={(event) =>
                      setAdapterConfig((prev) =>
                        prev
                          ? { ...prev, endpointUrl: event.target.value, updatedAt: new Date().toISOString() }
                          : prev
                      )
                    }
                    placeholder="https://api.example.com/inventory"
                    disabled={!canManageSources}
                  />
                </div>
              )}
              {adapterConfig?.kind === "csv" && (
                <div className="space-y-2">
                  <Label>CSV Delimiter</Label>
                  <Select
                    value={adapterConfig?.fileDelimiter || ","}
                    onValueChange={(value) =>
                      setAdapterConfig((prev) =>
                        prev
                          ? { ...prev, fileDelimiter: value as DataSourceAdapterConfig["fileDelimiter"], updatedAt: new Date().toISOString() }
                          : prev
                      )
                    }
                    disabled={!canManageSources}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=",">Comma (,)</SelectItem>
                      <SelectItem value=";">Semicolon (;)</SelectItem>
                      <SelectItem value="\t">Tab</SelectItem>
                      <SelectItem value="|">Pipe (|)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>SKU field</Label>
                <Input
                  value={adapterConfig?.columnMapping?.sku || ""}
                  onChange={(event) => setMappingField("sku", event.target.value)}
                  placeholder="sku"
                  disabled={!canManageSources}
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity field</Label>
                <Input
                  value={adapterConfig?.columnMapping?.quantity || ""}
                  onChange={(event) => setMappingField("quantity", event.target.value)}
                  placeholder="quantity"
                  disabled={!canManageSources}
                />
              </div>
              <div className="space-y-2">
                <Label>Date field</Label>
                <Input
                  value={adapterConfig?.columnMapping?.date || ""}
                  onChange={(event) => setMappingField("date", event.target.value)}
                  placeholder="date"
                  disabled={!canManageSources}
                />
              </div>
              <div className="space-y-2">
                <Label>Location field (optional)</Label>
                <Input
                  value={adapterConfig?.columnMapping?.location || ""}
                  onChange={(event) => setMappingField("location", event.target.value)}
                  placeholder="location"
                  disabled={!canManageSources}
                />
              </div>
            </div>
          </div>
        )}

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input type="date" id="start-date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <Input type="date" id="end-date" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="target-variable">Target Variable</Label>
          <Input id="target-variable" placeholder="e.g., sales, revenue, demand" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Data Description</Label>
          <Textarea id="description" placeholder="Describe your dataset and forecasting objectives..." rows={3} />
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-medium">Forecasting Options</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Plan</Label>
              <div className="text-sm capitalize text-muted-foreground">{plan || "free"}</div>
            </div>
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={mode} onValueChange={setMode} disabled={!allowGlobal}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="global" disabled={!allowGlobal}>
                    Global (Pro)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Seasonality</Label>
              <Select value={seasonality} onValueChange={setSeasonality}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium">Processing Options</h4>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm">
              <input type="checkbox" className="rounded" defaultChecked />
              <span>Auto-detect date columns</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input type="checkbox" className="rounded" defaultChecked />
              <span>Handle missing values</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input type="checkbox" className="rounded" />
              <span>Remove outliers</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input type="checkbox" className="rounded" />
              <span>Apply seasonal adjustment</span>
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
