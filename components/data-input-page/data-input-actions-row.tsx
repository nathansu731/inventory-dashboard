import { Button } from "@/components/ui/button"

type DataInputActionsRowProps = {
  canManageSources: boolean
  isImportRunning: boolean
  canRunImportNow: boolean
  isProcessing: boolean
  hasUploadedFile: boolean
  onRunDueImports: () => void
  onRunImportNow: () => void
  onStartForecasting: () => void
}

export const DataInputActionsRow = ({
  canManageSources,
  isImportRunning,
  canRunImportNow,
  isProcessing,
  hasUploadedFile,
  onRunDueImports,
  onRunImportNow,
  onStartForecasting,
}: DataInputActionsRowProps) => {
  return (
    <div className="mt-8 flex justify-end gap-4">
      <Button variant="outline" onClick={onRunDueImports} disabled={!canManageSources || isImportRunning}>
        Run Due Imports
      </Button>
      <Button variant="outline" disabled={!canRunImportNow || isImportRunning} onClick={onRunImportNow}>
        {isImportRunning ? "Importing..." : "Run Import Now"}
      </Button>
      <Button disabled={!hasUploadedFile || isProcessing} className="min-w-32" onClick={onStartForecasting}>
        {isProcessing ? "Processing..." : "Start Forecasting"}
      </Button>
    </div>
  )
}
