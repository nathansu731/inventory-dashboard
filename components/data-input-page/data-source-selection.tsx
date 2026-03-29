import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Link2, CheckCircle2, AlertTriangle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import React from "react"

export type ConnectorProvider = "csv" | "shopify" | "amazon" | "quickbooks" | "bigcommerce" | "other"

export type ConnectorState = "not_connected" | "connected" | "error"

type DataSourceSelectionProps = {
  availableObjects: string[]
  defaultSelectedObjects: string[]
  provider: ConnectorProvider
  setProvider: React.Dispatch<React.SetStateAction<ConnectorProvider>>
  connectionState: ConnectorState
  connectedAccount: string
  connectedAt: string | null
  canManageSources: boolean
  onConnect: (payload: { accountName: string; accountId: string; availableTables: string[]; selectedTables: string[] }) => void
  onDisconnect: () => void
}

const providerLabel = (provider: ConnectorProvider) => {
  if (provider === "csv") return "CSV"
  if (provider === "shopify") return "Shopify"
  if (provider === "amazon") return "Amazon"
  if (provider === "quickbooks") return "QuickBooks"
  if (provider === "bigcommerce") return "BigCommerce"
  return "Other"
}

const providerOptions: Array<{ value: ConnectorProvider; label: string }> = [
  { value: "csv", label: "CSV" },
  { value: "shopify", label: "Shopify" },
  { value: "amazon", label: "Amazon" },
  { value: "quickbooks", label: "QuickBooks" },
  { value: "bigcommerce", label: "BigCommerce" },
  { value: "other", label: "Other" },
]

export const DataSourceSelection = ({
  availableObjects,
  defaultSelectedObjects,
  provider,
  setProvider,
  connectionState,
  connectedAccount,
  connectedAt,
  canManageSources,
  onConnect,
  onDisconnect,
}: DataSourceSelectionProps) => {
  const isCsvProvider = provider === "csv"
  const [showConnectDialog, setShowConnectDialog] = React.useState(false)
  const [accountName, setAccountName] = React.useState("")
  const [accountId, setAccountId] = React.useState("")
  const [selectedObjects, setSelectedObjects] = React.useState<string[]>(defaultSelectedObjects)

  const connectedLabel = connectedAt
    ? new Date(connectedAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
    : null

  const connectNow = () => {
    if (isCsvProvider) return
    const requiresAccountName = provider === "shopify" || provider === "other"
    if (requiresAccountName && !accountName.trim()) return
    onConnect({
      accountName: accountName.trim(),
      accountId: accountId.trim(),
      availableTables: availableObjects,
      selectedTables: selectedObjects,
    })
    setShowConnectDialog(false)
    setAccountName("")
    setAccountId("")
  }

  React.useEffect(() => {
    setSelectedObjects(defaultSelectedObjects)
  }, [provider, defaultSelectedObjects])

  const toggleObject = (name: string, checked: boolean) => {
    setSelectedObjects((prev) => {
      if (checked) return prev.includes(name) ? prev : [...prev, name]
      return prev.filter((item) => item !== name)
    })
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Data Source Configuration
          </CardTitle>
          <CardDescription>Configure file uploads and connect commerce/accounting platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-1">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <div className="flex flex-wrap gap-2">
                {providerOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={provider === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setProvider(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Connection Status</div>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  {isCsvProvider ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>CSV upload mode enabled</span>
                    </>
                  ) : connectionState === "connected" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>
                        Connected to {connectedAccount} ({providerLabel(provider)})
                      </span>
                    </>
                  ) : connectionState === "error" ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span>Connection requires attention</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4" />
                      <span>No active connection</span>
                    </>
                  )}
                </div>
                {connectedLabel && <div className="mt-1 text-xs text-muted-foreground">Connected on {connectedLabel}</div>}
              </div>

              {!isCsvProvider && (
                <div className="flex items-center gap-2">
                  {connectionState === "connected" ? (
                    <Button variant="outline" onClick={onDisconnect} disabled={!canManageSources}>
                      Disconnect
                    </Button>
                  ) : (
                    <Button onClick={() => setShowConnectDialog(true)} disabled={!canManageSources}>
                      Connect
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {connectionState === "error" && !isCsvProvider && (
            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Connection issue detected. Reconnect your provider to continue syncing.
            </div>
          )}
        </CardContent>
      </Card>

      {!isCsvProvider && (
        <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect {providerLabel(provider)}</DialogTitle>
              <DialogDescription>
                {provider === "shopify" || provider === "other"
                  ? "Provide source details to establish the connection."
                  : "You will be redirected to the provider OAuth screen to grant access."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Tables / Objects to import</Label>
                <div className="max-h-40 space-y-2 overflow-auto rounded-md border p-3">
                  {availableObjects.length > 0 ? (
                    availableObjects.map((objectName) => (
                      <label key={objectName} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={selectedObjects.includes(objectName)}
                          onChange={(event) => toggleObject(objectName, event.target.checked)}
                        />
                        <span>{objectName}</span>
                      </label>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No objects discovered yet for this provider. Connect first, then sync metadata.
                    </div>
                  )}
                </div>
              </div>
              {(provider === "shopify" || provider === "other") && (
                <div className="grid gap-2">
                  <Label htmlFor="account-name">Account / Store Name</Label>
                  <Input
                    id="account-name"
                    placeholder={provider === "shopify" ? "e.g., your-store.myshopify.com" : "e.g., ARK Main Store"}
                    value={accountName}
                    onChange={(event) => setAccountName(event.target.value)}
                  />
                </div>
              )}
              {provider === "other" && (
                <div className="grid gap-2">
                  <Label htmlFor="account-id">Account ID (optional)</Label>
                  <Input
                    id="account-id"
                    placeholder="e.g., shop_12345"
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConnectDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={connectNow}
                disabled={(provider === "shopify" || provider === "other") && !accountName.trim()}
              >
                {provider === "shopify" || provider === "other" ? "Connect" : "Continue to OAuth"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
