import {Crown, Star, Zap} from "lucide-react";
import type React from "react";

export type PlanType = "free" | "team" | "enterprise" | "custom"

export type ModalStep = "plan-details" | "payment"

type PlanDetailsTypes = {
    name: string
    price: string
    description: string
    features: string[]
    icon?: React.ReactNode
    popular?: boolean
}

export const planDetails: Record<PlanType, PlanDetailsTypes> = {
    free: {
        name: "Free",
        price: "$0",
        description: "Perfect for getting started",
        features: ["Up to 3 projects", "Basic support", "1GB storage", "Community access"],
    },
    team: {
        name: "Team",
        price: "$29",
        description: "Great for small teams",
        features: ["Up to 10 projects", "Priority support", "50GB storage", "Team collaboration", "Advanced analytics"],
        icon: <Star className="h-5 w-5" />,
        popular: true,
    },
    enterprise: {
        name: "Enterprise",
        price: "$99",
        description: "For growing businesses",
        features: [
            "Unlimited projects",
            "24/7 dedicated support",
            "500GB storage",
            "Advanced integrations",
            "Custom workflows",
            "SSO & security",
        ],
        icon: <Zap className="h-5 w-5 text-accent" />,
    },
    custom: {
        name: "Custom",
        price: "Contact",
        description: "Tailored to your needs",
        features: [
            "Everything in Enterprise",
            "Custom integrations",
            "Dedicated account manager",
            "On-premise deployment",
            "Custom SLA",
            "White-label options",
        ],
        icon: <Crown className="h-5 w-5 text-accent" />,
    },
}