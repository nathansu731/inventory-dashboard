import { Button } from "@/components/ui/button"

type DataConfigurationActionsProps = {
  canSaveSourceConfiguration: boolean
  isSavingSourceConfiguration: boolean
  onSaveSourceConfiguration: () => void
  showSourceConfigurationAction: boolean
}

export const DataConfigurationActions = ({
  canSaveSourceConfiguration,
  isSavingSourceConfiguration,
  onSaveSourceConfiguration,
  showSourceConfigurationAction,
}: DataConfigurationActionsProps) => {
  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex justify-end gap-2">
        {showSourceConfigurationAction ? (
          <Button variant="outline" onClick={onSaveSourceConfiguration} disabled={!canSaveSourceConfiguration || isSavingSourceConfiguration}>
            {isSavingSourceConfiguration ? "Saving..." : "Save Source Configuration"}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
