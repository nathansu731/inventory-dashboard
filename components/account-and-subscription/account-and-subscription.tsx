"use client"

import type React from "react"
import { useState } from "react"
import {ModalStep, planDetails, PlanType} from "@/components/account-and-subscription/plan-details-types";
import {AccountDetailsSection} from "@/components/account-and-subscription/account-details-section";
import {SubscriptionPlanCards} from "@/components/account-and-subscription/subscription-plan-cards";
import {PlanDetailsModal} from "@/components/account-and-subscription/plan-details-modal";

export const AccountAndSubscription = () => {
    const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalStep, setModalStep] = useState<ModalStep>("plan-details")
    const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal">("card")

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
                <SubscriptionPlanCards handlePlanClick={handlePlanClick}/>
                <div className="mt-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        All plans include a 14-day free trial. Cancel anytime. Questions?
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
                setPaymentMethod={setPaymentMethod}
                paymentMethod={paymentMethod}
                handleBackToPlan={handleBackToPlan}
            />
        </div>
    )
}