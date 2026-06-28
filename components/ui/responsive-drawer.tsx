"use client"

import * as React from "react"

import { Sheet, SheetContent } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const DESKTOP_DRAWER_MIN_WIDTH = 1025

const useIsDesktopDrawer = () => {
  const [isDesktop, setIsDesktop] = React.useState(false)

  React.useEffect(() => {
    const query = `(min-width: ${DESKTOP_DRAWER_MIN_WIDTH}px)`
    const mediaQuery = window.matchMedia(query)
    const handleChange = () => setIsDesktop(mediaQuery.matches)

    handleChange()
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  return isDesktop
}

type ResponsiveDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  desktopClassName?: string
  overlayClassName?: string
}

export function ResponsiveDrawer({
  open,
  onOpenChange,
  children,
  desktopClassName,
  overlayClassName,
}: ResponsiveDrawerProps) {
  const isDesktop = useIsDesktopDrawer()

  if (isDesktop) {
    if (!open) return null

    return (
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 overflow-hidden border-l bg-background shadow-lg",
          desktopClassName
        )}
      >
        {children}
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "gap-0 p-0 max-[480px]:w-full max-[480px]:max-w-none min-[481px]:w-[min(100vw,32rem)] sm:max-w-none",
          overlayClassName
        )}
      >
        {children}
      </SheetContent>
    </Sheet>
  )
}
