"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Bot, Loader2, Sparkles, X } from "lucide-react"

import { ResponsiveDrawer } from "@/components/ui/responsive-drawer"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { ForecastAssistantAction, ForecastAssistantPayload } from "@/lib/forecast-assistant"
import type { StreamRunSummary } from "@/components/data-input-page/use-run-status-stream"

type ItemStatus = "completed" | "in_progress" | "pending"

type CopilotContextInput = {
  runId?: string | null
  hasUploadedFile?: boolean
  hasConnectedSource?: boolean
  runStatus?: StreamRunSummary | null
  pageId?: string | null
  route?: string | null
  contextMode?: string | null
  selectedSku?: string | null
  selectedStore?: string | null
  onAction?: (action: ForecastAssistantAction | null, stepTitle: string) => boolean
}

type ForecastCopilotContextValue = {
  openCopilot: () => void
  closeCopilot: () => void
  setCopilotContext: (context: CopilotContextInput | null) => void
}

const ForecastCopilotContext = createContext<ForecastCopilotContextValue | null>(null)

const SESSION_KEY = "forecast-copilot-onboarding-v1"
const defaultPrompts = [
  "Guide me through getting my first forecast",
  "Check if my latest run is ready and what to do next",
  "Explain forecast quality and confidence in simple terms",
  "Summarize replenishment risks and recommended actions",
]

const inferPageId = (pathname: string | null | undefined) => {
  const route = String(pathname || "").trim()
  if (!route || route === "/") return "dashboard"
  if (route === "/data-input") return "data-input"
  if (route === "/dashboard") return "dashboard"
  if (route === "/overview") return "overview"
  if (route === "/kpis") return "kpis"
  if (route === "/replenishments") return "replenishments"
  if (route === "/notifications") return "notifications"
  if (route === "/reports" || route.startsWith("/reports/")) return "reports"
  if (route === "/forecasts/forecasting-summary") return "forecasting-summary"
  if (route === "/forecasts/forecast-navigator") return "forecast-navigator"
  if (route === "/forecasts/forecast-editor") return "forecast-editor"
  return route.replace(/^\//, "").replace(/\//g, "-") || "dashboard"
}

const formatItemStatus = (status: ItemStatus) => {
  if (status === "in_progress") return "In Progress"
  if (status === "completed") return "Completed"
  return "Pending"
}

const isSafeRoute = (route: string | null | undefined) => typeof route === "string" && route.startsWith("/")

const deriveChecklistStatus = (
  item: string,
  hasConnectedSource: boolean,
  hasUploadedFile: boolean,
  hasRunStarted: boolean,
  runPhase: ItemStatus
): ItemStatus => {
  const normalized = item.toLowerCase()
  if (normalized.includes("connect") || normalized.includes("source")) {
    return hasConnectedSource || hasUploadedFile || hasRunStarted ? "completed" : "pending"
  }
  if (normalized.includes("upload")) {
    return hasUploadedFile || hasRunStarted ? "completed" : "pending"
  }
  if (normalized.includes("run forecast") || normalized.includes("run forecasting")) {
    if (runPhase === "completed") return "completed"
    if (runPhase === "in_progress" || hasRunStarted) return "in_progress"
    return "pending"
  }
  if (normalized.includes("review")) {
    return runPhase === "completed" ? "completed" : "pending"
  }
  return "pending"
}

const deriveStepStatus = (
  stepId: string,
  hasConnectedSource: boolean,
  hasUploadedFile: boolean,
  hasRunStarted: boolean,
  runPhase: ItemStatus
): ItemStatus => {
  if (stepId === "connect-source") {
    return hasConnectedSource || hasUploadedFile || hasRunStarted ? "completed" : "pending"
  }
  if (stepId === "run-forecast") {
    if (runPhase === "completed") return "completed"
    if (runPhase === "in_progress" || hasRunStarted) return "in_progress"
    return "pending"
  }
  if (stepId === "review-results") {
    return runPhase === "completed" ? "completed" : "pending"
  }
  return "pending"
}

export function CopilotGemIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative flex size-5 items-center justify-center rounded-[0.45rem] bg-gradient-to-br from-sky-400 via-cyan-500 to-teal-500 shadow-sm",
        className
      )}
    >
      <span className="absolute inset-[2px] rounded-[0.35rem] bg-white/20" />
      <Sparkles className="relative z-10 size-3.5 text-white" />
    </span>
  )
}

export function ForecastCopilotProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [pageContext, setPageContext] = useState<CopilotContextInput | null>(null)
  const [open, setOpen] = useState(false)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [command, setCommand] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<ForecastAssistantPayload | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.sessionStorage.getItem(SESSION_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { payload?: ForecastAssistantPayload; command?: string } | null
      if (parsed?.payload) setPayload(parsed.payload)
      if (typeof parsed?.command === "string") setCommand(parsed.command)
    } catch {
      // Ignore malformed cache.
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!payload) {
      window.sessionStorage.removeItem(SESSION_KEY)
      return
    }
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ payload, command }))
  }, [payload, command])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const promptOptions = useMemo(() => {
    if (!payload?.suggestedPrompts || payload.suggestedPrompts.length === 0) {
      return defaultPrompts
    }
    return payload.suggestedPrompts
  }, [payload?.suggestedPrompts])

  const runPhase = useMemo<ItemStatus>(() => {
    const status = String(pageContext?.runStatus?.status || "").toUpperCase()
    if (status === "DONE") return "completed"
    if (status === "RUNNING" || status === "QUEUED") return "in_progress"
    return "pending"
  }, [pageContext?.runStatus?.status])

  const executePrompt = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim()
      if (!trimmed) return

      setLoading(true)
      setError(null)
      setOpen(true)

      const route = pageContext?.route || pathname || null
      const pageId = pageContext?.pageId || inferPageId(route)
      const contextMode =
        pageContext?.contextMode || (pageId === "data-input" ? "onboarding" : "analysis")

      try {
        const res = await fetch("/api/assistant/forecast-guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            command: trimmed,
            runId: pageContext?.runId || null,
            contextMode,
            pageId,
            route,
            selectedSku: pageContext?.selectedSku || null,
            selectedStore: pageContext?.selectedStore || null,
          }),
        })

        const json = (await res.json().catch(() => null)) as (ForecastAssistantPayload & { error?: string }) | null
        if (!res.ok) {
          setError(json?.error || "assistant_request_failed")
          return
        }

        setPayload(json)
        setCommand("")
      } catch {
        setError("assistant_request_failed")
      } finally {
        setLoading(false)
      }
    },
    [
      pageContext?.contextMode,
      pageContext?.pageId,
      pageContext?.route,
      pageContext?.runId,
      pageContext?.selectedSku,
      pageContext?.selectedStore,
      pathname,
    ]
  )

  const handleAction = useCallback(
    (action: ForecastAssistantAction | null, stepTitle: string) => {
      setOpen(false)
      const handled = pageContext?.onAction ? pageContext.onAction(action, stepTitle) : false
      if (!handled && isSafeRoute(action?.route)) {
        router.push(action?.route || "/data-input")
      }
    },
    [pageContext, router]
  )

  const setCopilotContext = useCallback((context: CopilotContextInput | null) => {
    setPageContext(context)
  }, [])

  const contextValue = useMemo<ForecastCopilotContextValue>(
    () => ({
      openCopilot: () => setOpen(true),
      closeCopilot: () => setOpen(false),
      setCopilotContext,
    }),
    [setCopilotContext]
  )

  const hasRunStarted = Boolean(pageContext?.runId)
  const hasConnectedSource = Boolean(pageContext?.hasConnectedSource)
  const hasUploadedFile = Boolean(pageContext?.hasUploadedFile)

  return (
    <ForecastCopilotContext.Provider value={contextValue}>
      {children}
      <ResponsiveDrawer open={open} onOpenChange={setOpen} desktopClassName="w-[30rem]">
        <div className="flex h-full flex-col bg-background">
          <div className="border-b bg-gradient-to-r from-sky-50 via-cyan-50 to-teal-50 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-sky-100 bg-white shadow-sm">
                  <CopilotGemIcon className="size-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-semibold text-slate-900">Forecast Copilot</div>
                  <p className="mt-1 text-sm text-slate-700">
                    Ask about setup, run status, forecast quality, KPIs, or replenishment risk.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 rounded-full"
                onClick={() => setOpen(false)}
                aria-label="Close Forecast Copilot"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="flex items-start gap-3">
                <div className="mt-1 flex size-8 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                  <Bot className="size-4" />
                </div>
                <div className="rounded-2xl rounded-tl-md border bg-white px-4 py-3 shadow-sm">
                  <div className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <Loader2 className="size-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              </div>
            ) : payload ? (
              <div className="space-y-4">
                {command.trim() && (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-slate-900 px-4 py-3 text-sm text-white shadow-sm">
                      {command}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="mt-1 flex size-8 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                    <Bot className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="rounded-2xl rounded-tl-md border bg-white px-4 py-3 shadow-sm">
                      <p className="text-sm leading-6 text-slate-700">{payload.assistantText}</p>
                    </div>

                    {(payload.warnings || []).length > 0 && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">Warnings</div>
                        <div className="space-y-2">
                          {(payload.warnings || []).map((warning) => (
                            <p key={warning} className="text-sm leading-6 text-amber-900">
                              {warning}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {(payload.evidence || []).length > 0 && (
                      <div className="rounded-2xl border bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evidence</div>
                          {typeof payload.confidence === "number" && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase text-muted-foreground">
                              Confidence {Math.round(payload.confidence * 100)}%
                            </span>
                          )}
                        </div>
                        <div className="space-y-3">
                          {(payload.evidence || []).map((item) => (
                            <div key={`${item.source}-${item.title}`} className="rounded-xl border px-3 py-3">
                              <div className="text-sm font-medium text-slate-900">{item.title}</div>
                              <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                              <div className="mt-2 text-[11px] uppercase tracking-wide text-slate-500">{item.source}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {payload.checklist.length > 0 && (
                      <div className="rounded-2xl border bg-white p-4 shadow-sm">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checklist</div>
                        <div className="space-y-2">
                          {payload.checklist.map((item) => {
                            const itemStatus = deriveChecklistStatus(item, hasConnectedSource, hasUploadedFile, hasRunStarted, runPhase)
                            return (
                              <div key={item} className="flex items-start justify-between gap-3 rounded-xl border px-3 py-2">
                                <span className="text-sm text-slate-700">{item}</span>
                                {itemStatus !== "pending" && (
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase text-muted-foreground">
                                    {formatItemStatus(itemStatus)}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {payload.steps.length > 0 && (
                      <div className="rounded-2xl border bg-white p-4 shadow-sm">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Steps</div>
                        <div className="space-y-3">
                          {payload.steps.map((step) => {
                            const stepStatus = deriveStepStatus(
                              step.id,
                              hasConnectedSource,
                              hasUploadedFile,
                              hasRunStarted,
                              runPhase
                            )
                            return (
                              <div key={step.id} className="rounded-xl border px-3 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm font-medium text-slate-900">{step.title}</div>
                                  {stepStatus !== "pending" && (
                                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase text-muted-foreground">
                                      {formatItemStatus(stepStatus)}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                                {step.action && isSafeRoute(step.action.route) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-3 bg-transparent"
                                    onClick={() => handleAction(step.action, step.title)}
                                  >
                                    {step.action.label || "Open"}
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[18rem] flex-col items-center justify-center rounded-3xl border border-dashed bg-slate-50/70 px-6 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <CopilotGemIcon className="size-8" />
                </div>
                <div className="mt-4 text-lg font-semibold text-slate-900">Start a forecast conversation</div>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Ask for onboarding help, a run health check, forecast explanation, or replenishment guidance.
                </p>
              </div>
            )}

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
          </div>

          <div className="border-t bg-background px-4 py-4">
            <div className="space-y-3">
              <Textarea
                placeholder="Ask Forecast Copilot anything about your forecasts..."
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                className="min-h-[110px] resize-none rounded-2xl bg-slate-50"
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault()
                    if (!loading && command.trim()) {
                      void executePrompt(command)
                    }
                  }
                }}
              />
              <div className="flex items-center justify-between gap-3">
                <Popover open={suggestionsOpen} onOpenChange={setSuggestionsOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="bg-transparent">
                      Suggestions
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80 p-2">
                    <div className="mb-2 px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Suggested prompts
                    </div>
                    <div className="space-y-1">
                      {promptOptions.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          className="w-full rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
                          onClick={() => {
                            setCommand((prev) => (prev.trim() ? `${prev.trim()}\n${prompt}` : prompt))
                            setSuggestionsOpen(false)
                          }}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  type="button"
                  onClick={() => void executePrompt(command)}
                  disabled={loading || command.trim().length === 0}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Thinking...
                    </span>
                  ) : (
                    "Run Prompt"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ResponsiveDrawer>
    </ForecastCopilotContext.Provider>
  )
}

export function useForecastCopilot() {
  const context = useContext(ForecastCopilotContext)
  if (!context) {
    throw new Error("useForecastCopilot must be used within ForecastCopilotProvider.")
  }
  return context
}
