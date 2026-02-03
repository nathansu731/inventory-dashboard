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

export const AccountAndSubscription = ({ initialUpgradePlan, initialStep }: AccountAndSubscriptionProps) => {
    const { profile } = useProfile()
    const customerEmail = typeof profile?.email === "string" ? profile.email : undefined
    const customerId = typeof profile?.sub === "string" ? profile.sub : undefined
    const currentPlanRaw = typeof profile?.["custom:plan"] === "string" ? profile["custom:plan"] : undefined
    const currentPlan =
        currentPlanRaw &&
        (["launch", "core", "professional"] as const).includes(
            currentPlanRaw.toLowerCase() as "launch" | "core" | "professional"
        )
            ? (currentPlanRaw.toLowerCase() as PlanType)
            : undefined
    const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalStep, setModalStep] = useState<ModalStep>("plan-details")

    const handlePlanClick = (plan: PlanType) => {
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
        const normalized = initialUpgradePlan?.toLowerCase()
        if (normalized === "core" || normalized === "launch" || normalized === "professional") {
            const upgradePlan = normalized as PlanType
            setSelectedPlan(upgradePlan)
            setModalStep(initialStep === "payment" ? "payment" : "plan-details")
            setIsModalOpen(true)
        }
    }, [initialUpgradePlan, initialStep])

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Account and Subscription</h1>
                    <p className="text-muted-foreground">Manage your account details and subscription plan</p>
                </div>
                <AccountDetailsSection/>
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-foreground mb-4">Choose Your Plan</h2>
                    <p className="text-muted-foreground mb-8">Select the perfect plan for your needs</p>
                </div>
                <SubscriptionPlanCards handlePlanClick={handlePlanClick} currentPlan={currentPlan} />
                <div className="mt-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        All plans are billed monthly. Cancel anytime. Questions?
                        <a href="#" className="text-primary hover:underline ml-1">
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
            />
        </div>
    )
}
