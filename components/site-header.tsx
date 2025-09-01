"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {Bell} from "lucide-react";
import {useCallback, useEffect, useState} from "react";
import {generateMockNotifications} from "@/components/notifications/generate-mock-notifications";
import {Notification} from "./notifications/notifications-types"


export function SiteHeader() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)


  useEffect(() => {
    const initialNotifications = generateMockNotifications(15)
    setNotifications(initialNotifications)
  }, [])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const newNotifications = generateMockNotifications(8)
    setNotifications((prev) => [...prev, ...newNotifications])
    setPage((prev) => prev + 1)

    if (page >= 5) {
      setHasMore(false)
    }

    setLoading(false)
  }, [loading, hasMore, page])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 py-1 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">Documents</h1>
        <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
        />
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
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <a
              href="https://github.com/shadcn-ui/ui/tree/main/apps/v4/app/(examples)/dashboard"
              rel="noopener noreferrer"
              target="_blank"
              className="dark:text-foreground"
            >
              GitHub
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}
