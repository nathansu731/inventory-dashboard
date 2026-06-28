"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import type { StreamRunSummary } from "@/components/data-input-page/use-run-status-stream"
import { formatRunStatusLabel } from "@/lib/run-status"

type ForecastRunStatusSectionProps = {
  runStatus: StreamRunSummary
}

export const ForecastRunStatusSection = ({ runStatus }: ForecastRunStatusSectionProps) => {
  const [dotCount, setDotCount] = useState(1)
  const formattedRunTime = (() => {
    if (!runStatus?.createdAt) return null
    const date = new Date(runStatus.createdAt)
    if (Number.isNaN(date.getTime())) return null
    return `${date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} at ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`
  })()

  const hasStatus = Boolean((runStatus.status || "").trim())
  const wasSubmitted = Boolean(runStatus.runId || hasStatus)
  const statusLabel = hasStatus ? formatRunStatusLabel(runStatus.status) : ""
  const normalizedStatus = String(runStatus.status || "").toUpperCase()
  const isActiveRun = normalizedStatus === "RUNNING" || normalizedStatus === "QUEUED"
  const statusTone =
    statusLabel === "Completed"
      ? "bg-green-100 text-green-800"
      : statusLabel === "Failed"
        ? "bg-red-100 text-red-800"
        : statusLabel === "Running"
          ? "bg-blue-100 text-blue-800"
          : statusLabel
            ? "bg-yellow-100 text-yellow-800"
            : "bg-gray-100 text-gray-800"

  useEffect(() => {
    if (!isActiveRun) {
      setDotCount(1)
      return
    }
    const timer = window.setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1)
    }, 450)
    return () => window.clearInterval(timer)
  }, [isActiveRun])

  const activeStageLabel = useMemo(() => {
    if (!isActiveRun) return null
    const createdAtMs = runStatus?.createdAt ? new Date(runStatus.createdAt).getTime() : Date.now()
    const startedAtMs = Number.isNaN(createdAtMs) ? Date.now() : createdAtMs
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000))
    const stages = ["Analyzing Data", "Validating", "Forecasting"]
    const stageIndex = normalizedStatus === "QUEUED" ? 0 : Math.min(stages.length - 1, Math.floor(elapsedSeconds / 8))
    return stages[stageIndex]
  }, [isActiveRun, normalizedStatus, runStatus?.createdAt])

  const animatedDots = ".".repeat(dotCount)

  return (
    <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-slate-900">{wasSubmitted ? "Forecast run submitted" : "Forecast start failed"}</div>
          {runStatus.runId && <div className="text-xs text-muted-foreground">Run ID: {runStatus.runId}</div>}
          {formattedRunTime && <div className="text-xs text-muted-foreground">{formattedRunTime}</div>}
          {runStatus.message && <div className="text-xs text-muted-foreground">{runStatus.message}</div>}
        </div>
        <div className="flex items-center gap-3">
          {isActiveRun && activeStageLabel && (
            <span className="inline-flex min-h-10 items-center px-1 py-2 text-sm font-bold text-slate-900">
              {activeStageLabel}
              <span className="ml-1 inline-block min-w-6 text-left text-base font-extrabold tracking-[0.2em] text-blue-700">{animatedDots}</span>
            </span>
          )}
          {hasStatus && <span className={`inline-flex min-h-10 items-center rounded-full px-4 py-2 text-sm font-medium ${statusTone}`}>{statusLabel}</span>}
          {wasSubmitted && (
            <Link
              href="/notifications"
              aria-label="Open notifications"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 bg-white/70 text-slate-700 transition-colors hover:bg-white hover:text-slate-900"
            >
              <Bell className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
