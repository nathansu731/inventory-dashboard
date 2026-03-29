import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import React from "react"
import type { ConnectorProvider, ConnectorState } from "@/components/data-input-page/data-source-selection"

type ConnectorImportSetupSectionProps = {
  provider: ConnectorProvider
  connectionState: ConnectorState
  canManageSources: boolean
  availableTables: string[]
  selectedTables: string[]
  setSelectedTables: React.Dispatch<React.SetStateAction<string[]>>
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

export const ConnectorImportSetupSection = ({
  provider,
  connectionState,
  canManageSources,
  availableTables,
  selectedTables,
  setSelectedTables,
  syncMode,
  setSyncMode,
  lastImportAt,
  nextImportAt,
  retryCount,
  lastError,
}: ConnectorImportSetupSectionProps) => {
  const isConnected = connectionState === "connected"
  const [editTablesOpen, setEditTablesOpen] = React.useState(false)

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

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Connector Import Setup</div>
          <div className="text-xs text-muted-foreground">Configure sync for {providerLabel(provider)} once connected.</div>
        </div>
        <Badge variant={isConnected ? "secondary" : "outline"}>
          {isConnected ? "Connected" : "Not connected"}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Tables / Objects to import</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditTablesOpen(true)}
              disabled={!isConnected || !canManageSources || availableTables.length === 0}
            >
              Edit
            </Button>
          </div>
          <div className="rounded-md border p-3">
            {selectedTables.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedTables.map((tableName) => (
                  <Badge key={tableName} variant="secondary">
                    {tableName}
                  </Badge>
                ))}
              </div>
            ) : availableTables.length > 0 ? (
              <div className="text-sm text-muted-foreground">No tables selected.</div>
            ) : (
              <div className="text-sm text-muted-foreground">No objects available yet for this provider.</div>
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
            <p className="text-xs text-muted-foreground">Schedule becomes effective after the first manual run.</p>
          </div>
          <div className="space-y-1 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            <div>Last import: {formatDateTime(lastImportAt)}</div>
            <div>Next import: {formatDateTime(nextImportAt)}</div>
            <div>Retry count: {retryCount}</div>
            {lastError && <div className="text-red-700">Last error: {lastError}</div>}
          </div>
        </div>
      </div>

      <Dialog open={editTablesOpen} onOpenChange={setEditTablesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tables / Objects</DialogTitle>
            <DialogDescription>Select which tables/objects should be imported for this source.</DialogDescription>
          </DialogHeader>
          <div className="max-h-64 space-y-2 overflow-auto rounded-md border p-3">
            {availableTables.length > 0 ? (
              availableTables.map((tableName) => (
                <label key={tableName} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selectedTables.includes(tableName)}
                    onChange={(event) => toggleTable(tableName, event.target.checked)}
                  />
                  <span>{tableName}</span>
                </label>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No objects available yet for this provider.</div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditTablesOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
