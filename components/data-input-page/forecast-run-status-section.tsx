import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { StreamRunSummary } from "@/components/data-input-page/use-run-status-stream"

type ForecastRunStatusSectionProps = {
  runStatus: StreamRunSummary
}

export const ForecastRunStatusSection = ({ runStatus }: ForecastRunStatusSectionProps) => {
  const formattedRunTime = (() => {
    if (!runStatus?.createdAt) return null
    const date = new Date(runStatus.createdAt)
    if (Number.isNaN(date.getTime())) return null
    return `${date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} at ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`
  })()

  const statusLabel = (runStatus.status || "").toUpperCase()
  const statusTone =
    statusLabel === "DONE"
      ? "bg-green-100 text-green-800"
      : statusLabel === "FAILED"
        ? "bg-red-100 text-red-800"
        : statusLabel === "RUNNING"
          ? "bg-blue-100 text-blue-800"
          : statusLabel
            ? "bg-yellow-100 text-yellow-800"
            : "bg-gray-100 text-gray-800"

  return (
    <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-slate-900">Forecast run submitted</div>
          {runStatus.runId && <div className="text-xs text-muted-foreground">Run ID: {runStatus.runId}</div>}
          {formattedRunTime && <div className="text-xs text-muted-foreground">{formattedRunTime}</div>}
          {runStatus.message && <div className="text-xs text-muted-foreground">{runStatus.message}</div>}
        </div>
        <div className="flex items-center gap-3">
          {statusLabel && <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone}`}>{statusLabel.toLowerCase()}</span>}
          <Button asChild size="sm" variant="outline" className="bg-transparent">
            <Link href="/notifications">Check the latest run status</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
