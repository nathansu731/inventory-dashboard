"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Bell } from "lucide-react"
import { useEffect, useState } from "react"
import {LogoutButton} from "@/components/logout/logout-button";


export function SiteHeader() {
  const [unreadCount, setUnreadCount] = useState(0)

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

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 py-1 lg:gap-2 lg:px-6">
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
