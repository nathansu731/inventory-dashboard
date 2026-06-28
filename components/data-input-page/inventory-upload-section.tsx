import type React from "react"
import { Database, FileText, Trash2, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type InventoryUploadSectionProps = {
  handleInventoryFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleInventoryFileDrop: (file: File) => void
  clearInventorySnapshot: () => Promise<void>
  inventoryFile: File | null
  inventoryStatus: {
    hasSnapshot: boolean
    metadata: {
      uploadedAt?: string | null
      rowCount?: number
      asOfDate?: string | null
      sourceType?: string | null
    } | null
    rowCount: number
  } | null
  inventoryActionMessage: string | null
}

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "N/A"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
}

export const InventoryUploadSection = ({
  handleInventoryFileUpload,
  handleInventoryFileDrop,
  clearInventorySnapshot,
  inventoryFile,
  inventoryStatus,
  inventoryActionMessage,
}: InventoryUploadSectionProps) => {
  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) {
      void handleInventoryFileDrop(file)
    }
  }

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Inventory Snapshot
        </CardTitle>
        <CardDescription>
          Upload a separate CSV with current stock on hand, or map an <code>on_hand</code> column in the main file.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Label htmlFor="inventory-file-upload" className="cursor-pointer">
          <div
            className="w-full rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/50"
            onDrop={onDrop}
            onDragOver={onDragOver}
          >
            <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">Drop inventory CSV here or click to browse</p>
            <p className="mt-1 text-xs text-muted-foreground">Expected columns: `sku`, optional `store`, and `on_hand`.</p>
            <Input id="inventory-file-upload" type="file" accept=".csv,text/csv" className="hidden" onChange={handleInventoryFileUpload} />
            <Button variant="outline" className="invisible mt-3 bg-transparent">
              Choose Inventory File
            </Button>
          </div>
        </Label>

        {inventoryFile && (
          <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
            <FileText className="h-5 w-5 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{inventoryFile.name}</p>
              <p className="text-xs text-muted-foreground">{(inventoryFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <Badge variant="secondary">Parsed</Badge>
          </div>
        )}

        {inventoryStatus?.hasSnapshot && inventoryStatus.metadata && (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">Active inventory snapshot</div>
                <div className="text-xs text-muted-foreground">
                  {inventoryStatus.rowCount} SKU-location pairs
                  {inventoryStatus.metadata.asOfDate ? ` • as of ${inventoryStatus.metadata.asOfDate}` : ""}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => void clearInventorySnapshot()}>
                <Trash2 className="mr-2 h-4 w-4" />
                Remove Snapshot
              </Button>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
              <div>Uploaded: {formatDateTime(inventoryStatus.metadata.uploadedAt)}</div>
              <div>Source: {inventoryStatus.metadata.sourceType || "inventory_csv"}</div>
            </div>
          </div>
        )}

        {inventoryActionMessage ? <p className="text-sm text-muted-foreground">{inventoryActionMessage}</p> : null}
      </CardContent>
    </Card>
  )
}
