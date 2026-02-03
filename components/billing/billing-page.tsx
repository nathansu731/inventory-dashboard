"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { useProfile } from "@/hooks/use-profile"

type BillingSubscription = {
    subscription_id: string
    customer_id: string
    status: string
    current_period_end: number | null
    cancel_at_period_end: boolean
    unit_amount: number | null
    currency: string | null
    interval: string | null
}

type BillingInvoice = {
    amount_due?: number | null
    amount_paid?: number | null
    currency?: string | null
    paid_at?: number | null
    next_payment_attempt?: number | null
    hosted_invoice_url?: string | null
    invoice_pdf?: string | null
    status?: string | null
}

type BillingData = {
    subscription?: BillingSubscription | null
    next_invoice?: BillingInvoice | null
    last_payment?: BillingInvoice | null
}

const formatMoney = (amount: number | null | undefined, currency: string | null | undefined) => {
    if (amount === null || amount === undefined) return "—"
    const safeCurrency = currency || "usd"
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: safeCurrency.toUpperCase(),
        maximumFractionDigits: 2,
    }).format(amount / 100)
}

const formatDate = (unixSeconds: number | null | undefined) => {
    if (!unixSeconds) return "—"
    return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    })
}

export const BillingPage = () => {
    const { profile } = useProfile()
    const customerId = useMemo(() => {
        const raw = profile?.["custom:stripe_cus_id"]
        return typeof raw === "string" && raw !== "unknown" ? raw : ""
    }, [profile])
    const subscriptionId = useMemo(() => {
        const raw = profile?.["custom:stripe_sub_id"]
        return typeof raw === "string" && raw !== "unknown" ? raw : ""
    }, [profile])
    const [data, setData] = useState<BillingData | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const loadBilling = async () => {
            if (!customerId) {
                setData(null)
                return
            }

            setIsLoading(true)
            try {
                const params = new URLSearchParams()
                params.set("customerId", customerId)
                if (subscriptionId) {
                    params.set("subscriptionId", subscriptionId)
                }
                const response = await fetch(`/api/billing?${params.toString()}`)
                const payload = await response.json()
                setData(payload)
            } catch (error) {
                setData(null)
            } finally {
                setIsLoading(false)
            }
        }

        void loadBilling()
    }, [customerId, subscriptionId])

    const subscription = data?.subscription
    const nextInvoice = data?.next_invoice
    const lastPayment = data?.last_payment

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Billing</h1>
                    <p className="text-muted-foreground">View your subscription, invoices, and upcoming payments</p>
                </div>

                {isLoading && (
                    <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
                        <p className="text-sm text-muted-foreground">Loading billing details...</p>
                    </div>
                )}

                {!isLoading && !customerId && (
                    <div className="rounded-lg border border-border bg-muted/30 p-10 text-center space-y-3">
                        <h2 className="text-xl font-semibold">No billing profile yet</h2>
                        <p className="text-sm text-muted-foreground">
                            Choose a plan to create your billing profile and start a subscription.
                        </p>
                        <Button asChild>
                            <Link href="/account-and-subscription">Choose a Plan</Link>
                        </Button>
                    </div>
                )}

                {!isLoading && customerId && !subscription && (
                    <div className="rounded-lg border border-border bg-muted/30 p-10 text-center space-y-3">
                        <h2 className="text-xl font-semibold">No active subscription</h2>
                        <p className="text-sm text-muted-foreground">
                            You don&apos;t have an active plan yet. Start a subscription to see billing details here.
                        </p>
                        <Button asChild>
                            <Link href="/account-and-subscription">View Plans</Link>
                        </Button>
                    </div>
                )}

                {!isLoading && subscription && (
                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="rounded-lg border border-border p-6 bg-background">
                            <h3 className="text-sm font-medium text-muted-foreground mb-3">Subscription</h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Status</span>
                                    <span className="text-sm font-semibold">{subscription.status}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Renews</span>
                                    <span className="text-sm font-semibold">
                                        {formatDate(subscription.current_period_end)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Amount</span>
                                    <span className="text-sm font-semibold">
                                        {formatMoney(subscription.unit_amount, subscription.currency)} / {subscription.interval || "month"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Auto-renew</span>
                                    <span className="text-sm font-semibold">
                                        {subscription.cancel_at_period_end ? "No" : "Yes"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-border p-6 bg-background">
                            <h3 className="text-sm font-medium text-muted-foreground mb-3">Next Invoice</h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Amount</span>
                                    <span className="text-sm font-semibold">
                                        {formatMoney(nextInvoice?.amount_due ?? null, nextInvoice?.currency ?? subscription.currency)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Date</span>
                                    <span className="text-sm font-semibold">
                                        {formatDate(nextInvoice?.next_payment_attempt ?? subscription.current_period_end)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Status</span>
                                    <span className="text-sm font-semibold">{nextInvoice?.status || "Upcoming"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-border p-6 bg-background">
                            <h3 className="text-sm font-medium text-muted-foreground mb-3">Last Payment</h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Amount</span>
                                    <span className="text-sm font-semibold">
                                        {formatMoney(lastPayment?.amount_paid ?? null, lastPayment?.currency ?? subscription.currency)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Date</span>
                                    <span className="text-sm font-semibold">{formatDate(lastPayment?.paid_at)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Receipt</span>
                                    <span className="text-sm font-semibold">
                                        {lastPayment?.hosted_invoice_url ? (
                                            <a
                                                className="text-primary hover:underline"
                                                href={lastPayment.hosted_invoice_url}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                View
                                            </a>
                                        ) : (
                                            "—"
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
