import type { TenantRecord } from "@/lib/data-sources"
import { getRateLimitRule, type RateLimitAction, type TenantPlan } from "@/lib/upload-guardrails"

type GuardrailRateLimitBucket = {
  timestamps?: unknown
}

type GuardrailRateLimitState = Record<string, GuardrailRateLimitBucket>

type ConsumeTenantRateLimitResult = {
  allowed: boolean
  limit: number
  retryAfterSeconds: number
  used: number
  windowSeconds: number
}

const normalizeTimestampArray = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((entry) => (typeof entry === "string" ? Date.parse(entry) : NaN))
        .filter((entry) => Number.isFinite(entry))
        .map((entry) => Number(entry))
    : []

export const consumeTenantRateLimit = ({
  tenantRecord,
  action,
  plan,
  now = Date.now(),
}: {
  tenantRecord: TenantRecord
  action: RateLimitAction
  plan: TenantPlan
  now?: number
}): ConsumeTenantRateLimitResult => {
  const { maxRequests, windowSeconds } = getRateLimitRule(action, plan)
  const windowStartMs = now - windowSeconds * 1000
  const state =
    typeof tenantRecord.guardrailRateLimits === "object" && tenantRecord.guardrailRateLimits
      ? (tenantRecord.guardrailRateLimits as GuardrailRateLimitState)
      : {}
  const bucket = (state[action] || {}) as GuardrailRateLimitBucket
  const recentTimestamps = normalizeTimestampArray(bucket.timestamps).filter((entry) => entry > windowStartMs)

  if (recentTimestamps.length >= maxRequests) {
    const oldestTimestamp = recentTimestamps[0] || now
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestTimestamp + windowSeconds * 1000 - now) / 1000))
    state[action] = { timestamps: recentTimestamps.map((entry) => new Date(entry).toISOString()) }
    tenantRecord.guardrailRateLimits = state
    return {
      allowed: false,
      limit: maxRequests,
      retryAfterSeconds,
      used: recentTimestamps.length,
      windowSeconds,
    }
  }

  const nextTimestamps = [...recentTimestamps, now]
  state[action] = { timestamps: nextTimestamps.map((entry) => new Date(entry).toISOString()) }
  tenantRecord.guardrailRateLimits = state
  return {
    allowed: true,
    limit: maxRequests,
    retryAfterSeconds: 0,
    used: nextTimestamps.length,
    windowSeconds,
  }
}
