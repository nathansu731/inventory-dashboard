"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Bell } from "lucide-react"
import { useEffect, useState } from "react"
import {LogoutButton} from "@/components/logout/logout-button";
import { useProfile } from "@/hooks/use-profile";


export function SiteHeader() {
  const [unreadCount, setUnreadCount] = useState(0)
  const { profile } = useProfile()

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
  const planNormalized = String(planRaw).toLowerCase()
  const planName =
    planNormalized === "enterprise"
      ? "Enterprise"
      : planNormalized === "professional" || planNormalized === "core"
        ? "Professional"
        : "Launch"
  const tenantStatus = typeof profile?.tenant_status === "string" ? profile.tenant_status.toLowerCase() : ""
  const subStatus =
    typeof profile?.["custom:sub_status"] === "string" ? String(profile["custom:sub_status"]).toLowerCase() : ""
  const trialEndsAt = typeof profile?.trial_ends_at === "string" ? profile.trial_ends_at : ""
  const trialEndMs = Date.parse(trialEndsAt)
  const trialing = (tenantStatus === "trialing" || subStatus === "trialing") && Number.isFinite(trialEndMs) && trialEndMs > Date.now()
  const trialDaysLeft = trialing ? Math.max(1, Math.ceil((trialEndMs - Date.now()) / (24 * 60 * 60 * 1000))) : null
  const upgradeHref =
    planName === "Launch"
      ? "/account-and-subscription?upgrade=professional&step=payment"
      : "/account-and-subscription?upgrade=enterprise&step=plan-details"

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 py-1 lg:gap-2 lg:px-6">
        {trialDaysLeft && (
          <div className="hidden md:flex items-center gap-3 text-sm text-amber-900 px-1 py-1">
            <span>
              You have {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left in your {planName} free trial.
            </span>
            <Button asChild size="sm" className="h-7">
              <Link href={upgradeHref}>Upgrade Now</Link>
            </Button>
          </div>
        )}
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
          <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <a
              href="/data-input"
              rel="noopener noreferrer"
              className="dark:text-foreground"
            >
              Connect
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}
