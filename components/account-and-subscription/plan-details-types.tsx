import {Rocket, Star, Zap} from "lucide-react";
import type React from "react";

export type PlanType = "launch" | "core" | "professional"

export type ModalStep = "plan-details" | "payment"

type PlanDetailsTypes = {
    name: string
    price: string
    priceId: string
    interval: string
    description: string
    features: string[]
    icon?: React.ReactNode
    popular?: boolean
}

export const planDetails: Record<PlanType, PlanDetailsTypes> = {
    launch: {
        name: "Launch",
        price: "$0",
        priceId: "price_1SpN9dEyjMYH6Im3iUDEsRHR",
        interval: "month",
        description: "Perfect for getting started",
        features: ["Up to 3 projects", "Basic support", "1GB storage", "Community access"],
        icon: <Rocket className="h-5 w-5" />,
    },
    core: {
        name: "Core",
        price: "$99",
        priceId: "price_1SCkQyEyjMYH6Im32jOYEUUR",
        interval: "month",
        description: "Great for growing teams",
        features: ["Up to 10 projects", "Priority support", "50GB storage", "Team collaboration", "Advanced analytics"],
        icon: <Star className="h-5 w-5" />,
        popular: true,
    },
    professional: {
        name: "Professional",
        price: "$299",
        priceId: "price_1SCgPmEyjMYH6Im3cim0brss",
        interval: "month",
        description: "For scale and automation",
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
}
