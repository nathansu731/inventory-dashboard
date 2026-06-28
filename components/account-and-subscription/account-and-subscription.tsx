"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useProfile } from "@/hooks/use-profile"
import {ModalStep, PlanType} from "@/components/account-and-subscription/plan-details-types";
import {AccountDetailsSection} from "@/components/account-and-subscription/account-details-section";
import {SubscriptionPlanCards} from "@/components/account-and-subscription/subscription-plan-cards";
import {PlanDetailsModal} from "@/components/account-and-subscription/plan-details-modal";
import { getSubscriptionAccessState } from "@/lib/subscription-state";

type AccountAndSubscriptionProps = {
    initialUpgradePlan?: string
    initialStep?: string
    initialReason?: string
}

type PlanPriceInfo = {
    displayPrice: string
    priceId?: string
}

export const AccountAndSubscription = ({ initialUpgradePlan, initialStep, initialReason }: AccountAndSubscriptionProps) => {
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
    const accessState = getSubscriptionAccessState({
        plan: currentPlanRaw,
        tenantStatus: profile?.effective_tenant_status ?? profile?.tenant_status,
        subscriptionStatus: profile?.["custom:sub_status"],
        trialEndsAt: profile?.trial_ends_at,
    })
    const normalizedCurrentPlan = accessState.plan
    const currentPlan =
        normalizedCurrentPlan &&
        (["launch", "professional", "enterprise"] as const).includes(
            normalizedCurrentPlan as "launch" | "professional" | "enterprise"
        )
            ? (normalizedCurrentPlan as PlanType)
            : undefined
    const isLaunchTrialActive = currentPlan === "launch" && accessState.isTrialing
    const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalStep, setModalStep] = useState<ModalStep>("plan-details")
    const [planPrices, setPlanPrices] = useState<Partial<Record<PlanType, PlanPriceInfo>>>({})
    const lastAppliedInitialRouteStateKey = useRef<string | null>(null)
    const role = typeof profile?.app_role === "string" ? profile.app_role : "admin"
    const isReadOnly = role === "manager"
    const initialPlanFromRoute = initialUpgradePlan?.toLowerCase()
    const initialModalStateKey = `${initialReason ?? ""}|${initialPlanFromRoute ?? ""}|${initialStep ?? ""}`

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
        setIsModalOpen(false)
        setSelectedPlan(null)
        setModalStep("plan-details")
    }

    useEffect(() => {
        if (lastAppliedInitialRouteStateKey.current === initialModalStateKey) return
        lastAppliedInitialRouteStateKey.current = initialModalStateKey
        if (isReadOnly) return
        if (initialReason === "trial_expired" && !initialUpgradePlan) return
        const mapped = initialPlanFromRoute === "core" ? "professional" : initialPlanFromRoute
        if (mapped === "launch" || mapped === "professional" || mapped === "enterprise") {
            const upgradePlan = mapped as PlanType
            setSelectedPlan(upgradePlan)
            setModalStep(initialStep === "payment" ? "payment" : "plan-details")
            setIsModalOpen(true)
        }
    }, [initialModalStateKey, isReadOnly])

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
                {accessState.accessRestricted && (
                    <div className="rounded-xl border border-red-300 bg-red-50 p-5">
                        <h2 className="text-lg font-semibold text-red-950">Trial ended. Choose a plan to continue.</h2>
                        <p className="mt-1 text-sm text-red-900">
                            Forecasting features are locked until you reactivate the account. Select Launch, Professional,
                            or Enterprise below to review pricing and continue.
                        </p>
                    </div>
                )}
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
                    accessRestricted={accessState.accessRestricted}
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
