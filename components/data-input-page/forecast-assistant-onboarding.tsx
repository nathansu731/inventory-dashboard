"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Bot, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import type { AssistantUsagePayload, ForecastAssistantPayload } from "@/lib/forecast-assistant"

type ForecastAssistantOnboardingProps = {
  runId: string | null
}

const defaultPrompts = [
  "Guide me through getting my first forecast",
  "Check if my latest run is ready and what to do next",
  "Explain forecast quality and confidence in simple terms",
  "Summarize replenishment risks and recommended actions",
]

export function ForecastAssistantOnboarding({ runId }: ForecastAssistantOnboardingProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [command, setCommand] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<ForecastAssistantPayload | null>(null)
  const [usage, setUsage] = useState<AssistantUsagePayload | null>(null)

  const loadUsage = useCallback(async () => {
    const res = await fetch("/api/assistant/usage", { cache: "no-store" })
    if (!res.ok) return
    const json = (await res.json()) as AssistantUsagePayload
    setUsage(json)
  }, [])

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

  useEffect(() => {
    void loadUsage()
  }, [loadUsage])

  const promptOptions = useMemo(() => {
    if (!payload?.suggestedPrompts || payload.suggestedPrompts.length === 0) {
      return defaultPrompts
    }
    return payload.suggestedPrompts
  }, [payload?.suggestedPrompts])

  const executePrompt = async (prompt: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/assistant/forecast-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: prompt,
          runId,
          contextMode: "onboarding",
        }),
      })

      const json = (await res.json().catch(() => null)) as ForecastAssistantPayload & { error?: string } | null
      if (!res.ok) {
        setError(json?.error || "assistant_request_failed")
        return
      }

      setPayload(json)
      setCommand(prompt)
      await loadUsage()
    } catch {
      setError("assistant_request_failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <Sparkles className="size-4" />
            Forecast Copilot
          </div>
          <p className="text-xs text-emerald-900/80">Use plain language commands to get step-by-step guidance from data input to forecast review.</p>
        </div>
        <Button variant="outline" size="sm" className="bg-white" onClick={() => setOpen(true)}>
          Open Copilot (Ctrl/Cmd + K)
        </Button>
      </div>

      {payload && (
        <div className="mt-4 space-y-3 rounded-lg border bg-white p-3">
          <div className="flex items-start gap-2 text-sm text-slate-700">
            <Bot className="mt-0.5 size-4 text-emerald-700" />
            <span>{payload.assistantText}</span>
          </div>
          {payload.checklist.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checklist</div>
              <ul className="mt-1 space-y-1 text-sm text-slate-700">
                {payload.checklist.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          )}
          {payload.steps.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step-by-step</div>
              {payload.steps.map((step) => (
                <div key={step.id} className="rounded-md border p-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium">{step.title}</div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase text-muted-foreground">{step.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
                  {step.action?.route && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setOpen(false)
                        router.push(step.action?.route || "/data-input")
                      }}
                    >
                      {step.action.label}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {usage && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border bg-white p-2">
            <div className="text-muted-foreground">Monthly Requests ({usage.monthKey})</div>
            <div className="font-semibold">{usage.requestsUsed}/{usage.requestsLimit}</div>
          </div>
          <div className="rounded-md border bg-white p-2">
            <div className="text-muted-foreground">Monthly Tokens</div>
            <div className="font-semibold">{usage.tokensUsed}/{usage.tokensLimit}</div>
          </div>
        </div>
      )}

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Forecast Copilot"
        description="Ask for onboarding help, run-readiness checks, or forecast explanations."
      >
        <CommandInput placeholder="Ask for guidance..." value={command} onValueChange={setCommand} />
        <CommandList>
          <CommandEmpty>
            <Button
              size="sm"
              disabled={loading || command.trim().length === 0}
              onClick={() => {
                void executePrompt(command)
              }}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Run command"}
            </Button>
          </CommandEmpty>
          <CommandGroup heading="Suggested Commands">
            {promptOptions.map((prompt) => (
              <CommandItem
                key={prompt}
                onSelect={() => {
                  void executePrompt(prompt)
                }}
              >
                {prompt}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Run Current Command">
            <CommandItem
              onSelect={() => {
                if (!command.trim()) return
                void executePrompt(command)
              }}
            >
              {loading ? "Running..." : `Run: ${command || "Type a command"}`}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </div>
  )
}
