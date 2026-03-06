export type ForecastAssistantAction = {
  id: string
  label: string
  route: string | null
  kind: string
}

export type ForecastAssistantStep = {
  id: string
  title: string
  description: string
  status: "completed" | "in_progress" | "pending"
  action: ForecastAssistantAction | null
}

export type ForecastAssistantPayload = {
  status: string
  intent: string
  assistantText: string
  context: Record<string, unknown> | null
  checklist: string[]
  suggestedPrompts: string[]
  steps: ForecastAssistantStep[]
}

export type AssistantUsagePayload = {
  monthKey: string
  requestsUsed: number
  requestsLimit: number
  tokensUsed: number
  tokensLimit: number
  rateMinuteLimit: number
  rateHourLimit: number
}
