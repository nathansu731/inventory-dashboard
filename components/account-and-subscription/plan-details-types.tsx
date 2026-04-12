import {Rocket, Star, Zap} from "lucide-react";
import type React from "react";

export type PlanType = "launch" | "professional" | "enterprise"

export type ModalStep = "plan-details" | "payment"

type PlanDetailsTypes = {
    name: string
    price: string
    priceId?: string
    interval: string
    description: string
    features: string[]
    icon?: React.ReactNode
    popular?: boolean
}

export const planDetails: Record<PlanType, PlanDetailsTypes> = {
    launch: {
        name: "Launch",
        price: "$99",
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_LAUNCH || "",
        interval: "month",
        description: "Perfect for teams getting started",
        features: ["Up to 3 projects", "Basic support", "1GB storage", "Community access"],
        icon: <Rocket className="h-5 w-5" />,
    },
    professional: {
        name: "Professional",
        price: "$199",
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL || "",
        interval: "month",
        description: "Great for growing teams",
        features: ["Up to 10 projects", "Priority support", "50GB storage", "Team collaboration", "Advanced analytics"],
        icon: <Star className="h-5 w-5" />,
        popular: true,
    },
    enterprise: {
        name: "Enterprise",
        price: "Custom",
        interval: "month",
        description: "For scale, compliance, and bespoke workflows",
        features: [
            "Unlimited projects",
            "24/7 dedicated support",
            "Custom storage",
            "Advanced integrations",
            "Custom workflows",
            "SSO & security",
        ],
        icon: <Zap className="h-5 w-5 text-accent" />,
    },
}
