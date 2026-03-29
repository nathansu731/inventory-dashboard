import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { AdapterTemplate, DataSourceAdapterConfig } from "@/lib/data-source-adapters"
import type React from "react"

type AdapterTemplateKitSectionProps = {
  canManageSources: boolean
  adapterTemplates: AdapterTemplate[]
  adapterConfig: DataSourceAdapterConfig | null
  setAdapterConfig: React.Dispatch<React.SetStateAction<DataSourceAdapterConfig | null>>
}

export const AdapterTemplateKitSection = ({
  canManageSources,
  adapterTemplates,
  adapterConfig,
  setAdapterConfig,
}: AdapterTemplateKitSectionProps) => {
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
    <div className="rounded-lg border p-4">
      <div className="text-sm font-medium">Adapter Template Kit</div>
      <div className="text-xs text-muted-foreground">Configure reusable CSV/API adapter settings for custom systems.</div>
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
                authHeaderName: typeof sample.authHeaderName === "string" ? sample.authHeaderName : prev?.authHeaderName,
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
                  prev ? { ...prev, endpointUrl: event.target.value, updatedAt: new Date().toISOString() } : prev
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
                  prev ? { ...prev, fileDelimiter: value as DataSourceAdapterConfig["fileDelimiter"], updatedAt: new Date().toISOString() } : prev
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
  )
}
