"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { CopilotGemIcon, useForecastCopilot } from "@/components/copilot/forecast-copilot-provider"
import type { StreamRunSummary } from "@/components/data-input-page/use-run-status-stream"
import type { ForecastAssistantAction } from "@/lib/forecast-assistant"

type ForecastAssistantOnboardingProps = {
  runId: string | null
  hasUploadedFile: boolean
  hasConnectedSource: boolean
  runStatus: StreamRunSummary | null
  onAction?: (action: ForecastAssistantAction | null, stepTitle: string) => boolean
}

export function ForecastAssistantOnboarding({
  runId,
  hasUploadedFile,
  hasConnectedSource,
  runStatus,
  onAction,
}: ForecastAssistantOnboardingProps) {
  const { openCopilot, setCopilotContext } = useForecastCopilot()

  useEffect(() => {
    setCopilotContext({
      runId,
      hasUploadedFile,
      hasConnectedSource,
      runStatus,
      pageId: "data-input",
      route: "/data-input",
      contextMode: "onboarding",
      onAction,
    })

    return () => setCopilotContext(null)
  }, [hasConnectedSource, hasUploadedFile, onAction, runId, runStatus, setCopilotContext])

  return (
    <div className="mb-6 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-cyan-50 to-teal-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CopilotGemIcon />
            Forecast Copilot
          </div>
          <p className="text-xs text-slate-700">
            Open Copilot for setup guidance, forecast checks, KPI explanation, and replenishment help.
          </p>
        </div>
        <Button variant="outline" size="sm" className="bg-white" onClick={openCopilot}>
          Open Copilot (Ctrl/Cmd + K)
        </Button>
      </div>
    </div>
  )
}
