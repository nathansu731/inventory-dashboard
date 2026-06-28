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
import { getSubscriptionAccessState } from "@/lib/subscription-state";

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
    const accessState = getSubscriptionAccessState({
        plan: planRaw,
        tenantStatus: profile?.effective_tenant_status ?? profile?.tenant_status,
        subscriptionStatus: profile?.["custom:sub_status"],
        trialEndsAt: profile?.trial_ends_at,
    })
    const plan = accessState.plan === "enterprise" ? "Enterprise" : accessState.plan === "professional" ? "Professional" : "Launch"
    const stripeCustomerIdRaw = profile?.["custom:stripe_cus_id"]
    const stripeSubscriptionIdRaw = profile?.["custom:stripe_sub_id"]
    const stripeCustomerId =
        typeof stripeCustomerIdRaw === "string" && stripeCustomerIdRaw !== "unknown" ? stripeCustomerIdRaw : ""
    const stripeSubscriptionId =
        typeof stripeSubscriptionIdRaw === "string" && stripeSubscriptionIdRaw !== "unknown" ? stripeSubscriptionIdRaw : ""
    const {
        accessRestricted,
        billingStatusLabel,
        isTrialing,
        restoreAccessHref,
        trialDaysLeft: accessTrialDaysLeft,
        trialEndMs,
        upgradeHref,
    } = accessState

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
            if (!stripeCustomerId) {
                setNextBillingDate("--")
                if (isTrialing && trialEndMs) {
                    setBillingStatus(billingStatusLabel)
                    setTrialDaysLeft(accessTrialDaysLeft)
                    setNextBillingDate(
                        new Date(trialEndMs).toLocaleDateString("en-US", { year: "numeric", month: "long" })
                    )
                } else {
                    setTrialDaysLeft(accessRestricted ? 0 : null)
                    setBillingStatus(billingStatusLabel)
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
                    setBillingStatus(billingStatusLabel)
                    return
                }
                const payload = (await res.json()) as {
                    subscription?: { current_period_end?: number | null; status?: string | null } | null
                }
                const renewsAt = payload?.subscription?.current_period_end
                const status = payload?.subscription?.status
                setNextBillingDate(formatDate(typeof renewsAt === "number" ? renewsAt : undefined))
                setBillingStatus(status ? String(status).replaceAll("_", " ") : billingStatusLabel)
                if (String(status || "").toLowerCase() === "trialing" && typeof renewsAt === "number") {
                    setTrialDaysLeft(Math.max(1, Math.ceil((renewsAt * 1000 - Date.now()) / (24 * 60 * 60 * 1000))))
                } else {
                    setTrialDaysLeft(accessRestricted ? 0 : null)
                }
            } catch {
                setNextBillingDate("--")
                setTrialDaysLeft(accessRestricted ? 0 : null)
                setBillingStatus(billingStatusLabel)
            }
        }
        void loadBilling()
    }, [accessRestricted, accessTrialDaysLeft, billingStatusLabel, isTrialing, stripeCustomerId, stripeSubscriptionId, trialEndMs])

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
                        {accessRestricted && (
                            <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3">
                                <p className="text-sm text-red-900">
                                    Trial access has ended. Upgrade to restore forecasting, reporting, and dashboard access.
                                </p>
                                <Button asChild size="sm" className="mt-2">
                                    <Link href={restoreAccessHref}>Restore Access</Link>
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
