"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function AutoRedirect({ delayMs = 5000 }: { delayMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.push("/overview")
    }, delayMs)
    return () => window.clearTimeout(timer)
  }, [delayMs, router])

  return null
}
