"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useProfile } from "@/hooks/use-profile"

type MonthlyMetric = {
  value: number
  variance: number
  status: "positive" | "negative" | "stable"
}

type MonthlyTotalsResult = {
  totalRevenue?: MonthlyMetric
  stockoutRiskSkus?: MonthlyMetric
  forecastAccuracy?: MonthlyMetric
  newCustomers?: MonthlyMetric
  activeAccounts?: MonthlyMetric
  growthRate?: MonthlyMetric
}

const EMPTY_STATE_MODAL_KEY = "overview_empty_state_modal_seen"

export function SectionCards() {
  const router = useRouter()
  const { profile, isLoading: isProfileLoading } = useProfile()
  const [data, setData] = useState<MonthlyTotalsResult | null>(null)
  const [showEmptyDataModal, setShowEmptyDataModal] = useState(false)

  useEffect(() => {
    if (isProfileLoading) return

    const loadMonthlyTotals = async () => {
      const res = await fetch("/api/get-monthly-totals")
      if (!res.ok) return

      const json = await res.json()
      const status = typeof json?.status === "string" ? json.status.toLowerCase() : ""
      const result =
          typeof json.result === "string"
              ? JSON.parse(json.result)
              : json.result

      setData(result)

      const isResultEmptyObject =
        Boolean(result) && typeof result === "object" && !Array.isArray(result) && Object.keys(result).length === 0
      const shouldPromptUpload = status === "empty" && isResultEmptyObject

      if (!shouldPromptUpload) return

      const userKeyPart =
        (typeof profile?.sub === "string" && profile.sub) ||
        (typeof profile?.email === "string" && profile.email) ||
        "anonymous"
      const modalSeenKey = `${EMPTY_STATE_MODAL_KEY}:${userKeyPart}`
      const hasShownModal = window.localStorage.getItem(modalSeenKey) === "true"
      if (!hasShownModal) {
        setShowEmptyDataModal(true)
        window.localStorage.setItem(modalSeenKey, "true")
      }
    }

    loadMonthlyTotals()
  }, [isProfileLoading, profile?.sub, profile?.email])

  const formatValue = (value?: number) =>
      value !== undefined ? value.toLocaleString() : "--"

  const formatPercent = (variance?: number) =>
      variance !== undefined ? `${(variance * 100).toFixed(1)}%` : "--"

  const TrendIcon = ({ status }: { status?: string }) =>
      status === "negative" ? <IconTrendingDown /> : <IconTrendingUp />

  return (
      <>
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {/* Total Revenue */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              ${formatValue(data?.totalRevenue?.value)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendIcon status={data?.totalRevenue?.status} />
                {formatPercent(data?.totalRevenue?.variance)}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Monthly revenue trend <TrendIcon status={data?.totalRevenue?.status} />
            </div>
            <div className="text-muted-foreground">
              Based on latest reporting period
            </div>
          </CardFooter>
        </Card>

        {/* Stockout Risk */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Stockout Risk SKUs</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatValue(data?.stockoutRiskSkus?.value ?? data?.newCustomers?.value)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendIcon status={data?.stockoutRiskSkus?.status ?? data?.newCustomers?.status} />
                {formatPercent(data?.stockoutRiskSkus?.variance ?? data?.newCustomers?.variance)}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Critical/high risk SKU trend <TrendIcon status={data?.stockoutRiskSkus?.status ?? data?.newCustomers?.status} />
            </div>
            <div className="text-muted-foreground">
              Near-term replenishment exposure
            </div>
          </CardFooter>
        </Card>

        {/* Forecast Accuracy */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Forecast Accuracy</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {data?.forecastAccuracy?.value !== undefined
                ? `${data.forecastAccuracy.value.toFixed(1)}%`
                : data?.activeAccounts?.value !== undefined
                  ? `${data.activeAccounts.value.toFixed(1)}%`
                  : "--"}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendIcon status={data?.forecastAccuracy?.status ?? data?.activeAccounts?.status} />
                {formatPercent(data?.forecastAccuracy?.variance ?? data?.activeAccounts?.variance)}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Model performance vs baseline <TrendIcon status={data?.forecastAccuracy?.status ?? data?.activeAccounts?.status} />
            </div>
            <div className="text-muted-foreground">
              Higher is better (100% - SMAPE)
            </div>
          </CardFooter>
        </Card>

        {/* Growth Rate */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Growth Rate</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatPercent(data?.growthRate?.variance)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendIcon status={data?.growthRate?.status} />
                {formatPercent(data?.growthRate?.variance)}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Growth momentum <TrendIcon status={data?.growthRate?.status} />
            </div>
            <div className="text-muted-foreground">
              Performance vs expectations
            </div>
          </CardFooter>
        </Card>
      </div>
      <Dialog open={showEmptyDataModal} onOpenChange={setShowEmptyDataModal}>
        <DialogContent className="max-w-md" showCloseButton={false}>
          <div className="space-y-5">
            <Image
              src="/images/login-forecasting.svg"
              alt="Upload inventory data to start forecasting"
              width={260}
              height={160}
              className="mx-auto h-40 w-auto rounded-[30%]"
            />
            <DialogHeader className="space-y-3 text-center">
              <DialogTitle className="text-xl">No Forecast Data Yet</DialogTitle>
              <DialogDescription className="text-sm leading-6">
                If you have not added any SKUs yet, upload your data first to see forecasting trends and insights.
              </DialogDescription>
            </DialogHeader>
            <Button
              className="h-11 w-full bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => {
                setShowEmptyDataModal(false)
                router.push("/data-input")
              }}
            >
              Upload Data
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </>
  )
}
