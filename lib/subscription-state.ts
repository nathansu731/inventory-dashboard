export type SubscriptionAccessState = {
  plan: "launch" | "professional" | "enterprise"
  tenantStatus: string
  subscriptionStatus: string
  effectiveStatus: string
  trialEndsAt: string
  trialEndMs: number | null
  trialDaysLeft: number | null
  isTrialing: boolean
  isTrialExpired: boolean
  accessRestricted: boolean
  billingStatusLabel: string
  upgradeHref: string
  restoreAccessHref: string
}

const ACTIVE_BILLING_STATUSES = new Set(["active", "past_due", "unpaid"])

export const normalizePlan = (value: unknown): "launch" | "professional" | "enterprise" => {
  const plan = String(value || "").toLowerCase().trim()
  if (plan === "enterprise") return "enterprise"
  if (plan === "professional" || plan === "core" || plan === "pro") return "professional"
  return "launch"
}

const toTitleCase = (value: string) =>
  value
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ")

export const getSubscriptionAccessState = ({
  plan,
  tenantStatus,
  subscriptionStatus,
  trialEndsAt,
  now = Date.now(),
}: {
  plan?: unknown
  tenantStatus?: unknown
  subscriptionStatus?: unknown
  trialEndsAt?: unknown
  now?: number
}): SubscriptionAccessState => {
  const normalizedPlan = normalizePlan(plan)
  const normalizedTenantStatus = typeof tenantStatus === "string" ? tenantStatus.trim().toLowerCase() : ""
  const normalizedSubscriptionStatus =
    typeof subscriptionStatus === "string" ? subscriptionStatus.trim().toLowerCase() : ""
  const normalizedTrialEndsAt = typeof trialEndsAt === "string" ? trialEndsAt : ""
  const parsedTrialEndMs = Date.parse(normalizedTrialEndsAt)
  const trialEndMs = Number.isFinite(parsedTrialEndMs) ? parsedTrialEndMs : null
  const trialActive = trialEndMs !== null && trialEndMs > now
  const trialEnded = trialEndMs !== null && trialEndMs <= now
  const trialStatus =
    normalizedTenantStatus === "trialing" ||
    normalizedTenantStatus === "trial_expired" ||
    normalizedSubscriptionStatus === "trialing"
  const hasNonTrialAccess =
    ACTIVE_BILLING_STATUSES.has(normalizedTenantStatus) || ACTIVE_BILLING_STATUSES.has(normalizedSubscriptionStatus)

  const isTrialExpired = trialStatus && trialEnded && !hasNonTrialAccess
  const isTrialing = trialStatus && trialActive
  const trialDaysLeft = isTrialing && trialEndMs !== null ? Math.max(1, Math.ceil((trialEndMs - now) / 86400000)) : null
  const effectiveStatus = isTrialExpired
    ? "trial_expired"
    : isTrialing
      ? "trialing"
      : normalizedTenantStatus || normalizedSubscriptionStatus || (normalizedPlan === "launch" ? "active" : "")

  const billingStatusLabel =
    effectiveStatus === "trial_expired"
      ? "Trial expired"
      : effectiveStatus
        ? toTitleCase(effectiveStatus)
        : "--"

  return {
    plan: normalizedPlan,
    tenantStatus: normalizedTenantStatus,
    subscriptionStatus: normalizedSubscriptionStatus,
    effectiveStatus,
    trialEndsAt: normalizedTrialEndsAt,
    trialEndMs,
    trialDaysLeft,
    isTrialing,
    isTrialExpired,
    accessRestricted: isTrialExpired,
    billingStatusLabel,
    upgradeHref:
      isTrialing
        ? `/account-and-subscription?upgrade=${normalizedPlan}&step=payment`
        : normalizedPlan === "launch"
          ? "/account-and-subscription?upgrade=professional&step=payment"
          : "/account-and-subscription?upgrade=enterprise&step=plan-details",
    restoreAccessHref: `/account-and-subscription?reason=trial_expired&upgrade=${normalizedPlan}&step=plan-details`,
  }
}
