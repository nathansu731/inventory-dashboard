import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getValidIdToken } from "@/lib/server-auth"

type PlanKey = "launch" | "core" | "professional"

const PLAN_PRICE_IDS: Record<PlanKey, string> = {
  launch: "price_1SpN9dEyjMYH6Im3iUDEsRHR",
  core: "price_1SCkQyEyjMYH6Im32jOYEUUR",
  professional: "price_1SCgPmEyjMYH6Im3cim0brss",
}

const formatAmount = (unitAmount: number | null, currency: string, interval: string) => {
  if (unitAmount === null) return "Custom"
  const normalizedCurrency = (currency || "usd").toUpperCase()
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: normalizedCurrency,
    maximumFractionDigits: 2,
  }).format(unitAmount / 100)
  return interval ? `${amount}/${interval}` : amount
}

export async function GET() {
  const { idToken, cookiesToSet } = await getValidIdToken()
  if (!idToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const responsePlans: Record<PlanKey, { priceId: string; unitAmount: number | null; currency: string; interval: string; displayPrice: string }> = {
    launch: { priceId: PLAN_PRICE_IDS.launch, unitAmount: 0, currency: "usd", interval: "month", displayPrice: "$0/month" },
    core: { priceId: PLAN_PRICE_IDS.core, unitAmount: 9900, currency: "usd", interval: "month", displayPrice: "$99/month" },
    professional: { priceId: PLAN_PRICE_IDS.professional, unitAmount: 29900, currency: "usd", interval: "month", displayPrice: "$299/month" },
  }

  try {
    const keys = Object.keys(PLAN_PRICE_IDS) as PlanKey[]
    await Promise.all(
      keys.map(async (key) => {
        try {
          const price = await stripe.prices.retrieve(PLAN_PRICE_IDS[key])
          const amount = typeof price.unit_amount === "number" ? price.unit_amount : null
          const currency = typeof price.currency === "string" ? price.currency : "usd"
          const interval = price.recurring?.interval || "month"
          responsePlans[key] = {
            priceId: PLAN_PRICE_IDS[key],
            unitAmount: amount,
            currency,
            interval,
            displayPrice: formatAmount(amount, currency, interval),
          }
        } catch {
          // Keep fallback values when Stripe retrieval fails for an individual plan.
        }
      })
    )

    const response = NextResponse.json({ plans: responsePlans })
    for (const cookie of cookiesToSet) {
      response.cookies.set(cookie.name, cookie.value, cookie.options)
    }
    return response
  } catch {
    const response = NextResponse.json({ plans: responsePlans })
    for (const cookie of cookiesToSet) {
      response.cookies.set(cookie.name, cookie.value, cookie.options)
    }
    return response
  }
}
