import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Link2, CheckCircle2, AlertTriangle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import React from "react"
import type { DataSourceDiagnostics } from "@/lib/data-sources"
import type { ProviderBlueprint } from "@/lib/provider-source-config"

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
  blueprint: ProviderBlueprint | null
  diagnostics: DataSourceDiagnostics | null
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

const providerActionLabel = (provider: ConnectorProvider) => {
  if (provider === "shopify") return "Continue to Shopify"
  if (provider === "quickbooks") return "Continue to QuickBooks"
  if (provider === "bigcommerce") return "Continue to BigCommerce"
  if (provider === "amazon") return "Continue to Amazon"
  return "Connect"
}

export const DataSourceSelection = ({
  availableObjects,
  defaultSelectedObjects,
  provider,
  setProvider,
  connectionState,
  connectedAccount,
  connectedAt,
  canManageSources,
  blueprint,
  diagnostics,
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

  const blockers = diagnostics?.blockingIssues || []

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Data Source Configuration
          </CardTitle>
          <CardDescription>Choose how this app connects, what permissions are required, and which operational data will feed forecasts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
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

          {!isCsvProvider && blueprint && (
            <div className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">{blueprint.label}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{blueprint.authStyle}</div>
                  <p className="max-w-2xl text-sm text-muted-foreground">{blueprint.description}</p>
                </div>
                <Badge variant="outline">{blueprint.authStyle}</Badge>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Connection flow</div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {blueprint.connectionSteps.map((step, index) => (
                      <div key={step} className="flex gap-2">
                        <span className="text-foreground">{index + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Required entities</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {blueprint.requiredEntities.map((item) => (
                        <Badge key={item} variant="secondary">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Optional entities</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {blueprint.optionalEntities.map((item) => (
                        <Badge key={item} variant="outline">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Forecast-ready fields</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {blueprint.forecastFields.map((item) => (
                        <Badge key={item} variant="outline">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg border p-4">
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

            {!isCsvProvider && diagnostics?.userMessage && (
              <div className="mt-4 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                <div className="font-medium text-foreground">{diagnostics.statusSummary || "Connector status"}</div>
                <div className="mt-1">{diagnostics.userMessage}</div>
                {diagnostics.grantedScopes?.length ? (
                  <div className="mt-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Granted scopes</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {diagnostics.grantedScopes.map((scope) => (
                        <Badge key={scope} variant="outline">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {!isCsvProvider && blockers.length > 0 && (
              <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <div className="font-medium">Blocked right now</div>
                <div className="mt-2 space-y-1">
                  {blockers.map((issue) => (
                    <div key={issue}>• {issue}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!isCsvProvider && blueprint?.notes?.length ? (
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium">What happens after connect</div>
              <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                {blueprint.notes.map((note) => (
                  <div key={note}>• {note}</div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!isCsvProvider && (
        <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect {providerLabel(provider)}</DialogTitle>
              <DialogDescription>
                {blueprint?.description || "Connect this provider and then review the discovered entities, permissions, and date strategy before importing."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              {blueprint && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">High-level connection steps</div>
                  <div className="mt-2 space-y-1">
                    {blueprint.connectionSteps.map((step, index) => (
                      <div key={step}>
                        {index + 1}. {step}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid gap-2">
                <Label>Seed entities to request</Label>
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
                      No provider objects discovered yet. The app will validate permissions after connection and populate them here.
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
              {(provider === "quickbooks" || provider === "bigcommerce" || provider === "amazon" || provider === "other") && (
                <div className="grid gap-2">
                  <Label htmlFor="account-id">Company / Account ID (optional)</Label>
                  <Input
                    id="account-id"
                    placeholder={provider === "quickbooks" ? "realmId is detected after consent" : "Optional account identifier"}
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
                {providerActionLabel(provider)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
