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
    invoice_id?: string
    number?: string | null
    amount_due?: number | null
    amount_paid?: number | null
    currency?: string | null
    created?: number | null
    due_date?: number | null
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
    invoice_history?: BillingInvoice[]
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
    const [isOpeningPortal, setIsOpeningPortal] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadBilling = async () => {
            if (!customerId) {
                setData(null)
                setError(null)
                return
            }

            setIsLoading(true)
            setError(null)
            try {
                const params = new URLSearchParams()
                params.set("customerId", customerId)
                if (subscriptionId) {
                    params.set("subscriptionId", subscriptionId)
                }
                const response = await fetch(`/api/billing?${params.toString()}`)
                const payload = await response.json()
                setData(payload)
            } catch {
                setData(null)
                setError("Failed to load billing details.")
            } finally {
                setIsLoading(false)
            }
        }

        void loadBilling()
    }, [customerId, subscriptionId])

    const subscription = data?.subscription
    const nextInvoice = data?.next_invoice
    const lastPayment = data?.last_payment

    const openPortal = async () => {
        if (!customerId || isOpeningPortal) return
        setIsOpeningPortal(true)
        try {
            const response = await fetch("/api/billing/portal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerId,
                    returnUrl: `${window.location.origin}/billing`,
                }),
            })
            const payload = (await response.json()) as { url?: string; error?: string }
            if (!response.ok || !payload.url) {
                throw new Error(payload.error || `portal_error_${response.status}`)
            }
            window.location.assign(payload.url)
        } catch (err) {
            const message = err instanceof Error ? err.message : "portal_session_failed"
            setError(`Failed to open billing portal (${message}).`)
        } finally {
            setIsOpeningPortal(false)
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-[2000px] mx-auto p-5 min-w-0 space-y-5">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Billing</h1>
                    <p className="text-muted-foreground mt-1">View your subscription, next payment, and invoice history.</p>
                </div>

                {error && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {!isLoading && customerId && subscription && (
                    <div className="flex justify-end">
                        <Button onClick={openPortal} disabled={isOpeningPortal}>
                            {isOpeningPortal ? "Opening..." : "Manage Subscription"}
                        </Button>
                    </div>
                )}

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
                    <>
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

                        <div className="rounded-lg border border-border p-6 bg-background">
                            <h3 className="text-sm font-medium text-muted-foreground mb-4">Invoice History</h3>
                            {!data?.invoice_history?.length ? (
                                <p className="text-sm text-muted-foreground">No invoices available yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-muted-foreground">
                                                <th className="py-2 pr-3 text-left font-medium">Invoice</th>
                                                <th className="py-2 pr-3 text-left font-medium">Date</th>
                                                <th className="py-2 pr-3 text-left font-medium">Amount</th>
                                                <th className="py-2 pr-3 text-left font-medium">Status</th>
                                                <th className="py-2 pr-3 text-left font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.invoice_history.map((invoice) => (
                                                <tr key={invoice.invoice_id} className="border-b last:border-0">
                                                    <td className="py-3 pr-3">{invoice.number || invoice.invoice_id || "—"}</td>
                                                    <td className="py-3 pr-3">{formatDate(invoice.paid_at ?? invoice.due_date ?? invoice.created)}</td>
                                                    <td className="py-3 pr-3">
                                                        {formatMoney(
                                                            invoice.amount_paid ?? invoice.amount_due ?? null,
                                                            invoice.currency ?? subscription.currency
                                                        )}
                                                    </td>
                                                    <td className="py-3 pr-3 capitalize">{invoice.status || "—"}</td>
                                                    <td className="py-3 pr-3">
                                                        <div className="flex items-center gap-3">
                                                            {invoice.hosted_invoice_url && (
                                                                <a
                                                                    className="text-primary hover:underline"
                                                                    href={invoice.hosted_invoice_url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                >
                                                                    View
                                                                </a>
                                                            )}
                                                            {invoice.invoice_pdf && (
                                                                <a
                                                                    className="text-primary hover:underline"
                                                                    href={invoice.invoice_pdf}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                >
                                                                    Download PDF
                                                                </a>
                                                            )}
                                                            {!invoice.hosted_invoice_url && !invoice.invoice_pdf && "—"}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
