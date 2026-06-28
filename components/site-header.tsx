"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Bell } from "lucide-react"
import { useEffect, useState } from "react"
import {LogoutButton} from "@/components/logout/logout-button";
import { useProfile } from "@/hooks/use-profile";
import { CopilotGemIcon, useForecastCopilot } from "@/components/copilot/forecast-copilot-provider";
import { getSubscriptionAccessState } from "@/lib/subscription-state";


export function SiteHeader() {
  const [unreadCount, setUnreadCount] = useState(0)
  const { profile } = useProfile()
  const { openCopilot } = useForecastCopilot()

  useEffect(() => {
    const loadNotifications = async () => {
      const res = await fetch("/api/list-notifications?limit=10")
      if (!res.ok) return
      const payload = await res.json()
      const items = payload?.items ?? []
      const unread = items.filter((item: { read?: boolean }) => !item.read).length
      setUnreadCount(unread)
    }

    loadNotifications()
  }, [])

  const planRaw =
    typeof profile?.["custom:plan"] === "string"
      ? profile["custom:plan"]
      : typeof profile?.tenant_plan === "string"
        ? profile.tenant_plan
        : "launch"
  const accessState = getSubscriptionAccessState({
    plan: planRaw,
    tenantStatus: profile?.effective_tenant_status ?? profile?.tenant_status,
    subscriptionStatus: profile?.["custom:sub_status"],
    trialEndsAt: profile?.trial_ends_at,
  })
  const planName =
    accessState.plan === "enterprise" ? "Enterprise" : accessState.plan === "professional" ? "Professional" : "Launch"

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 py-1 lg:gap-2 lg:px-6">
        {accessState.accessRestricted ? (
          <div className="hidden md:flex items-center gap-3 rounded-md bg-red-50 px-3 py-1 text-sm text-red-900">
            <span>Your free trial has ended. Upgrade to restore access.</span>
            <Button asChild size="sm" className="h-7">
              <Link href={accessState.restoreAccessHref}>Restore Access</Link>
            </Button>
          </div>
        ) : accessState.trialDaysLeft ? (
          <div className="hidden md:flex items-center gap-3 text-sm text-amber-900 px-1 py-1">
            <span>
              You have {accessState.trialDaysLeft} day{accessState.trialDaysLeft === 1 ? "" : "s"} left in your {planName} free trial.
            </span>
            <Button asChild size="sm" className="h-7">
              <Link href={accessState.upgradeHref}>Upgrade Now</Link>
            </Button>
          </div>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <Button size="icon" variant="ghost" className="relative">
            <a href="/notifications">
              <Bell />
              {unreadCount > 0 && (
                  <span className="absolute top-1 right-0 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
           {unreadCount}
              </span>
              )}
            </a>
          </Button>
          <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-4"
          />
          <LogoutButton/>
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <Button variant="ghost" size="sm" onClick={openCopilot}>
            <CopilotGemIcon />
            Copilot
          </Button>
        </div>
      </div>
    </header>
  )
}
