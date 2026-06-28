"use client"

import { useEffect, startTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useProfile } from "@/hooks/use-profile"
import { getSubscriptionAccessState } from "@/lib/subscription-state"

const ALLOWED_RESTRICTED_PATHS = ["/account-and-subscription", "/billing", "/success"]
const RESTRICTED_PLANS_ROUTE = "/account-and-subscription?reason=trial_expired"

export function SubscriptionAccessGuard() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, isLoading } = useProfile()

  const accessState = getSubscriptionAccessState({
    plan: profile?.tenant_plan ?? profile?.["custom:plan"],
    tenantStatus: profile?.effective_tenant_status ?? profile?.tenant_status,
    subscriptionStatus: profile?.["custom:sub_status"],
    trialEndsAt: profile?.trial_ends_at,
  })

  const routeAllowed = ALLOWED_RESTRICTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))

  useEffect(() => {
    if (isLoading || !profile || !accessState.accessRestricted || routeAllowed) return

    startTransition(() => {
      router.replace(RESTRICTED_PLANS_ROUTE)
    })
  }, [accessState.accessRestricted, isLoading, profile, routeAllowed, router])

  return null
}
