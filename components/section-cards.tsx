"use client"

import { useEffect, useState } from "react"
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type MonthlyMetric = {
  value: number
  variance: number
  status: "positive" | "negative" | "stable"
}

type MonthlyTotalsResult = {
  totalRevenue?: MonthlyMetric
  newCustomers?: MonthlyMetric
  activeAccounts?: MonthlyMetric
  growthRate?: MonthlyMetric
}

export function SectionCards() {
  const [data, setData] = useState<MonthlyTotalsResult | null>(null)

  useEffect(() => {
    const loadMonthlyTotals = async () => {
      const res = await fetch("/api/get-monthly-totals")
      if (!res.ok) return

      const json = await res.json()
      const result =
          typeof json.result === "string"
              ? JSON.parse(json.result)
              : json.result
      console.log("Data",result)

      setData(result)
    }

    loadMonthlyTotals()
  }, [])

  const formatValue = (value?: number) =>
      value !== undefined ? value.toLocaleString() : "--"

  const formatPercent = (variance?: number) =>
      variance !== undefined ? `${(variance * 100).toFixed(1)}%` : "--"

  const TrendIcon = ({ status }: { status?: string }) =>
      status === "negative" ? <IconTrendingDown /> : <IconTrendingUp />

  return (
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

        {/* New Customers */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>New Customers</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatValue(data?.newCustomers?.value)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendIcon status={data?.newCustomers?.status} />
                {formatPercent(data?.newCustomers?.variance)}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Customer acquisition trend <TrendIcon status={data?.newCustomers?.status} />
            </div>
            <div className="text-muted-foreground">
              Compared to previous period
            </div>
          </CardFooter>
        </Card>

        {/* Active Accounts */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Active Accounts</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatValue(data?.activeAccounts?.value)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendIcon status={data?.activeAccounts?.status} />
                {formatPercent(data?.activeAccounts?.variance)}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Account activity trend <TrendIcon status={data?.activeAccounts?.status} />
            </div>
            <div className="text-muted-foreground">
              Active users this month
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
  )
}
