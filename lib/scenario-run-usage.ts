import type { TenantRecord } from "@/lib/data-sources"
import type { TenantPlan } from "@/lib/upload-guardrails"

type ScenarioUsageState = Record<string, { count?: unknown }>

export type ScenarioRunUsage = {
  monthKey: string
  used: number
  limit: number | null
  remaining: number | null
}

const SCENARIO_RUN_LIMITS: Record<TenantPlan, number | null> = {
  launch: 20,
  professional: 30,
  enterprise: null,
}

const monthKeyFor = (date = new Date()) => date.toISOString().slice(0, 7)

const normalizeCount = (value: unknown) => {
  const count = Number(value)
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
}

export const getScenarioRunUsage = ({
  tenantRecord,
  plan,
  now,
}: {
  tenantRecord: TenantRecord | null | undefined
  plan: TenantPlan
  now?: Date
}): ScenarioRunUsage => {
  const monthKey = monthKeyFor(now)
  const state = tenantRecord?.scenarioRunUsage
  const buckets = typeof state === "object" && state ? (state as ScenarioUsageState) : {}
  const used = normalizeCount(buckets[monthKey]?.count)
  const limit = SCENARIO_RUN_LIMITS[plan]
  return { monthKey, used, limit, remaining: limit === null ? null : Math.max(0, limit - used) }
}

export const consumeScenarioRun = ({
  tenantRecord,
  plan,
  now,
}: {
  tenantRecord: TenantRecord
  plan: TenantPlan
  now?: Date
}) => {
  const usage = getScenarioRunUsage({ tenantRecord, plan, now })
  if (usage.limit !== null && usage.used >= usage.limit) {
    return { allowed: false, usage }
  }

  const state =
    typeof tenantRecord.scenarioRunUsage === "object" && tenantRecord.scenarioRunUsage
      ? (tenantRecord.scenarioRunUsage as ScenarioUsageState)
      : {}
  tenantRecord.scenarioRunUsage = {
    ...state,
    [usage.monthKey]: { count: usage.used + 1 },
  }
  return {
    allowed: true,
    usage: {
      ...usage,
      used: usage.used + 1,
      remaining: usage.limit === null ? null : Math.max(0, usage.limit - usage.used - 1),
    },
  }
}
