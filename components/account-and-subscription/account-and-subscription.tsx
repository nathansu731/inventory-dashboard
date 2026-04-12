"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useProfile } from "@/hooks/use-profile"
import {ModalStep, PlanType} from "@/components/account-and-subscription/plan-details-types";
import {AccountDetailsSection} from "@/components/account-and-subscription/account-details-section";
import {SubscriptionPlanCards} from "@/components/account-and-subscription/subscription-plan-cards";
import {PlanDetailsModal} from "@/components/account-and-subscription/plan-details-modal";

type AccountAndSubscriptionProps = {
    initialUpgradePlan?: string
    initialStep?: string
}

type PlanPriceInfo = {
    displayPrice: string
}

export const AccountAndSubscription = ({ initialUpgradePlan, initialStep }: AccountAndSubscriptionProps) => {
    const { profile } = useProfile()
    const customerEmail = typeof profile?.email === "string" ? profile.email : undefined
    const customerId = typeof profile?.sub === "string" ? profile.sub : undefined
    const stripeCustomerIdRaw = profile?.["custom:stripe_cus_id"]
    const stripeCustomerId =
        typeof stripeCustomerIdRaw === "string" && stripeCustomerIdRaw !== "unknown" ? stripeCustomerIdRaw : undefined
    const currentPlanRaw =
        typeof profile?.["custom:plan"] === "string"
            ? profile["custom:plan"]
            : typeof profile?.tenant_plan === "string"
                ? profile.tenant_plan
                : undefined
    const tenantStatusRaw = typeof profile?.tenant_status === "string" ? profile.tenant_status : ""
    const trialEndsAtRaw = typeof profile?.trial_ends_at === "string" ? profile.trial_ends_at : ""
    const normalizedCurrentPlan = (() => {
        const plan = String(currentPlanRaw || "").toLowerCase().trim()
        if (plan === "enterprise") return "enterprise"
        if (plan === "professional" || plan === "core" || plan === "pro") return "professional"
        if (plan === "launch" || plan === "free") return "launch"
        return ""
    })()
    const currentPlan =
        normalizedCurrentPlan &&
        (["launch", "professional", "enterprise"] as const).includes(
            normalizedCurrentPlan as "launch" | "professional" | "enterprise"
        )
            ? (normalizedCurrentPlan as PlanType)
            : undefined
    const isLaunchTrialActive =
        currentPlan === "launch" &&
        tenantStatusRaw.toLowerCase() === "trialing" &&
        Boolean(trialEndsAtRaw) &&
        new Date(trialEndsAtRaw).getTime() > Date.now()
    const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalStep, setModalStep] = useState<ModalStep>("plan-details")
    const [planPrices, setPlanPrices] = useState<Partial<Record<PlanType, PlanPriceInfo>>>({})
    const role = typeof profile?.app_role === "string" ? profile.app_role : "admin"
    const isReadOnly = role === "manager"

    const handlePlanClick = (plan: PlanType) => {
        if (isReadOnly) return
        setSelectedPlan(plan)
        setModalStep("plan-details")
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setSelectedPlan(null)
        setModalStep("plan-details")
    }

    const handleProceedToPayment = () => {
        setModalStep("payment")
    }

    const handleBackToPlan = () => {
        setModalStep("plan-details")
    }

    useEffect(() => {
        if (isReadOnly) return
        const normalized = initialUpgradePlan?.toLowerCase()
        const mapped = normalized === "core" ? "professional" : normalized
        if (mapped === "launch" || mapped === "professional" || mapped === "enterprise") {
            const upgradePlan = mapped as PlanType
            setSelectedPlan(upgradePlan)
            setModalStep(initialStep === "payment" ? "payment" : "plan-details")
            setIsModalOpen(true)
        }
    }, [initialUpgradePlan, initialStep, isReadOnly])

    useEffect(() => {
        const loadPlanPrices = async () => {
            try {
                const res = await fetch("/api/subscription-plans", { cache: "no-store" })
                if (!res.ok) return
                const payload = (await res.json()) as {
                    plans?: Partial<Record<PlanType, PlanPriceInfo>>
                }
                if (payload?.plans) {
                    setPlanPrices(payload.plans)
                }
            } catch {
                setPlanPrices({})
            }
        }
        void loadPlanPrices()
    }, [])

    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-[2000px] mx-auto p-5 min-w-0 space-y-5">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Account and Subscription</h1>
                    <p className="text-muted-foreground mt-1">Manage your account details and subscription plan.</p>
                </div>
                <AccountDetailsSection/>
                <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Choose Your Plan</h2>
                    <p className="text-muted-foreground mb-6">Select the perfect plan for your needs.</p>
                    {isReadOnly && (
                        <p className="text-sm text-muted-foreground mb-4">
                            Managers have read-only access for billing and subscription changes.
                        </p>
                    )}
                </div>
                <SubscriptionPlanCards
                    handlePlanClick={handlePlanClick}
                    currentPlan={currentPlan}
                    isReadOnly={isReadOnly}
                    planPrices={planPrices}
                    isLaunchTrialActive={isLaunchTrialActive}
                />
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                        All plans are billed monthly. Cancel anytime. Questions?
                        <a href="mailto:info@arkforecasting.com.au" className="text-primary hover:underline ml-1">
                            Contact support
                        </a>
                    </p>
                </div>
            </div>
            <PlanDetailsModal
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                selectedPlan={selectedPlan}
                modalStep={modalStep}
                handleProceedToPayment={handleProceedToPayment}
                handleCloseModal={handleCloseModal}
                handleBackToPlan={handleBackToPlan}
                customerEmail={customerEmail}
                customerId={customerId}
                stripeCustomerId={stripeCustomerId}
                planPrices={planPrices}
            />
        </div>
    )
}
