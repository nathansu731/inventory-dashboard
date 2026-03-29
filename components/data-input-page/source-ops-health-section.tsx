export type HealthProviderRow = {
  sourceId: string
  provider: string
  state: "connected" | "error" | "not_connected"
  syncMode: string
  retryCount: number
  lastError: string | null
  lastImportAt: string | null
  nextImportAt: string | null
  stale: boolean
}

export type HealthSummary = {
  totalSources: number
  connected: number
  errored: number
  scheduled: number
  stale: number
  totalRetries: number
  success24h: number
  failures24h: number
  errorRate24h: number
}

type SourceOpsHealthSectionProps = {
  summary: HealthSummary
  providers: HealthProviderRow[]
}

export const SourceOpsHealthSection = ({ summary, providers }: SourceOpsHealthSectionProps) => {
  return (
    <div className="mt-4 rounded-lg border p-4 text-sm">
      <div className="font-medium">Source Ops Health</div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-xs text-muted-foreground">Connected</div>
          <div className="text-base font-semibold">{summary.connected}</div>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-xs text-muted-foreground">Errored</div>
          <div className="text-base font-semibold text-red-700">{summary.errored}</div>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-xs text-muted-foreground">Stale &gt; 24h</div>
          <div className="text-base font-semibold">{summary.stale}</div>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-xs text-muted-foreground">Retries</div>
          <div className="text-base font-semibold">{summary.totalRetries}</div>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-xs text-muted-foreground">Error rate 24h</div>
          <div className="text-base font-semibold">{summary.errorRate24h}%</div>
        </div>
      </div>
      {providers.length > 0 && (
        <div className="mt-3 space-y-2">
          {providers.slice(0, 6).map((row) => (
            <div key={row.sourceId} className="rounded-md bg-muted/30 p-2">
              <div className="text-sm">
                <span className="font-medium">{row.provider}</span> • {row.state} • {row.syncMode}
              </div>
              <div className="text-xs text-muted-foreground">
                Retries: {row.retryCount} • Last import: {row.lastImportAt ? new Date(row.lastImportAt).toLocaleString() : "N/A"}
              </div>
              {row.lastError && <div className="text-xs text-red-700">{row.lastError}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
