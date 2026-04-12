"use client"

import Link from "next/link";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Settings} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import type React from "react";
import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import type { AssistantUsagePayload } from "@/lib/forecast-assistant";

const formatDate = (unixSeconds: number | undefined) => {
    if (!unixSeconds) return "--"
    return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
    })
}

export const AccountDetailsSection = () => {
    const { profile } = useProfile()
    const [usage, setUsage] = useState<AssistantUsagePayload | null>(null)
    const [nextBillingDate, setNextBillingDate] = useState<string>("--")
    const [billingStatus, setBillingStatus] = useState<string>("--")
    const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null)
    const givenName = typeof profile?.given_name === "string" ? profile.given_name : ""
    const familyName = typeof profile?.family_name === "string" ? profile.family_name : ""
    const name = [givenName, familyName].filter(Boolean).join(" ")
        || (typeof profile?.name === "string" ? profile.name : "--")
    const email = typeof profile?.email === "string" ? profile.email : "--"
    const memberSince = typeof profile?.iat === "number" ? formatDate(profile.iat) : "--"
    const planRaw =
        typeof profile?.["custom:plan"] === "string"
            ? profile["custom:plan"]
            : typeof profile?.tenant_plan === "string"
                ? profile.tenant_plan
                : ""
    const tenantStatusRaw = typeof profile?.tenant_status === "string" ? profile.tenant_status : ""
    const trialEndsAtRaw = typeof profile?.trial_ends_at === "string" ? profile.trial_ends_at : ""
    const plan = (() => {
        const normalized = String(planRaw || "").toLowerCase().trim()
        if (normalized === "enterprise") return "Enterprise"
        if (normalized === "professional" || normalized === "core" || normalized === "pro") return "Professional"
        if (normalized === "launch" || normalized === "free") return "Launch"
        return "--"
    })()
    const stripeCustomerIdRaw = profile?.["custom:stripe_cus_id"]
    const stripeSubscriptionIdRaw = profile?.["custom:stripe_sub_id"]
    const stripeCustomerId =
        typeof stripeCustomerIdRaw === "string" && stripeCustomerIdRaw !== "unknown" ? stripeCustomerIdRaw : ""
    const stripeSubscriptionId =
        typeof stripeSubscriptionIdRaw === "string" && stripeSubscriptionIdRaw !== "unknown" ? stripeSubscriptionIdRaw : ""
    const upgradeHref = plan === "Launch"
        ? "/account-and-subscription?upgrade=professional&step=payment"
        : "/account-and-subscription?upgrade=enterprise&step=plan-details"

    useEffect(() => {
        const loadUsage = async () => {
            try {
                const res = await fetch("/api/assistant/usage", { cache: "no-store" })
                if (!res.ok) return
                const json = (await res.json()) as AssistantUsagePayload
                setUsage(json)
            } catch {
                setUsage(null)
            }
        }
        void loadUsage()
    }, [])

    useEffect(() => {
        const loadBilling = async () => {
            const toDaysLeft = (targetMs: number) => Math.max(1, Math.ceil((targetMs - Date.now()) / (24 * 60 * 60 * 1000)))

            if (!stripeCustomerId) {
                setNextBillingDate("--")
                const trialEndMs = Date.parse(trialEndsAtRaw)
                if (
                    tenantStatusRaw.toLowerCase() === "trialing" &&
                    Number.isFinite(trialEndMs) &&
                    trialEndMs > Date.now()
                ) {
                    setBillingStatus("trialing")
                    setTrialDaysLeft(toDaysLeft(trialEndMs))
                    setNextBillingDate(new Date(trialEndMs).toLocaleDateString("en-US", { year: "numeric", month: "long" }))
                } else {
                    setTrialDaysLeft(null)
                    setBillingStatus(plan === "--" ? "--" : "Active")
                }
                return
            }

            try {
                const params = new URLSearchParams()
                params.set("customerId", stripeCustomerId)
                if (stripeSubscriptionId) params.set("subscriptionId", stripeSubscriptionId)
                const res = await fetch(`/api/billing?${params.toString()}`, { cache: "no-store" })
                if (!res.ok) {
                    setNextBillingDate("--")
                    setBillingStatus(plan === "--" ? "--" : "Active")
                    return
                }
                const payload = (await res.json()) as {
                    subscription?: { current_period_end?: number | null; status?: string | null } | null
                }
                const renewsAt = payload?.subscription?.current_period_end
                const status = payload?.subscription?.status
                setNextBillingDate(formatDate(typeof renewsAt === "number" ? renewsAt : undefined))
                setBillingStatus(status ? status : plan === "--" ? "--" : "Active")
                if (String(status || "").toLowerCase() === "trialing" && typeof renewsAt === "number") {
                    setTrialDaysLeft(toDaysLeft(renewsAt * 1000))
                } else {
                    setTrialDaysLeft(null)
                }
            } catch {
                setNextBillingDate("--")
                setTrialDaysLeft(null)
                setBillingStatus(plan === "--" ? "--" : "Active")
            }
        }
        void loadBilling()
    }, [plan, stripeCustomerId, stripeSubscriptionId, tenantStatusRaw, trialEndsAtRaw])

    return (
        <Card className="mb-8 bg-card border-border">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Account Details
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold text-card-foreground mb-2">Profile Information</h3>
                        <div className="space-y-2 text-sm">
                            <p>
                                <span className="font-medium">Name:</span> {name}
                            </p>
                            <p>
                                <span className="font-medium">Email:</span> {email}
                            </p>
                            <p>
                                <span className="font-medium">Member since:</span> {memberSince}
                            </p>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-card-foreground mb-2">Current Plan</h3>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                                {plan}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{billingStatus === "--" ? "—" : billingStatus}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Next billing: {nextBillingDate}</p>
                        {trialDaysLeft && trialDaysLeft > 0 && (
                            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3">
                                <p className="text-sm text-amber-900">
                                    You have {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left in your {plan} free trial.
                                </p>
                                <Button asChild size="sm" className="mt-2">
                                    <Link href={upgradeHref}>Upgrade Now</Link>
                                </Button>
                            </div>
                        )}
                        {usage && (
                            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">Usage this month</p>
                                <p>
                                    Assistant requests ({usage.monthKey}):{" "}
                                    <span className="font-medium text-card-foreground">{usage.requestsUsed}/{usage.requestsLimit}</span>
                                </p>
                                <p>
                                    Assistant tokens:{" "}
                                    <span className="font-medium text-card-foreground">{usage.tokensUsed}/{usage.tokensLimit}</span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
