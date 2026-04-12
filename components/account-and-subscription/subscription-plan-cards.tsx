import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Check, Rocket, Star, Zap} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {PlanType} from "@/components/account-and-subscription/plan-details-types";

type SubscriptionPlanCardsProps = {
    handlePlanClick: (plan: PlanType) => void
    currentPlan?: PlanType
    isReadOnly?: boolean
    planPrices?: Partial<Record<PlanType, { displayPrice: string }>>
    isLaunchTrialActive?: boolean
}

const displayPlanPrice = (plan: PlanType, planPrices?: Partial<Record<PlanType, { displayPrice: string }>>) => {
    const livePrice = planPrices?.[plan]?.displayPrice
    if (livePrice) return livePrice.replace("/month", "")
    if (plan === "launch") return "$99"
    if (plan === "professional") return "$199"
    return "Custom"
}

export const SubscriptionPlanCards = ({handlePlanClick, currentPlan, isReadOnly = false, planPrices, isLaunchTrialActive = false }: SubscriptionPlanCardsProps) => {
    const isCurrent = (plan: PlanType) => currentPlan === plan
    const hasPaidPlan = currentPlan === "professional" || currentPlan === "enterprise"
    const handleCardClick = (plan: PlanType) => {
        if (!isReadOnly && !isCurrent(plan) && !(plan === "launch" && hasPaidPlan)) {
            handlePlanClick(plan)
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card
                className={`relative h-full bg-card border-border hover:shadow-lg transition-shadow ${isCurrent("launch") ? "border-primary" : ""} ${isCurrent("launch") ? "cursor-default" : "cursor-pointer"} flex flex-col`}
                onClick={() => handleCardClick("launch")}
            >
                {isLaunchTrialActive && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">
                            <Star className="h-3 w-3 mr-1"/>
                            Free Trial Active
                        </Badge>
                    </div>
                )}
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Rocket className="h-5 w-5 text-accent"/>
                            Launch
                        </CardTitle>
                        {isCurrent("launch") && (
                            <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                                Current Plan
                            </Badge>
                        )}
                        <div className="text-2xl font-bold">{displayPlanPrice("launch", planPrices)}</div>
                    </div>
                    <CardDescription>Perfect for getting started</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                    <ul className="space-y-3 mb-6">
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span className="text-sm">Up to 3 projects</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span className="text-sm">Basic support</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span className="text-sm">1GB storage</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span className="text-sm">Community access</span>
                        </li>
                    </ul>
                    <Button
                        variant="outline"
                        className="mt-auto w-full bg-transparent"
                        disabled={isCurrent("launch") || isReadOnly || hasPaidPlan}
                    >
                        {isCurrent("launch") ? "Current Plan" : hasPaidPlan ? "Current Plan" : isReadOnly ? "Read Only" : "Purchase Launch"}
                    </Button>
                </CardContent>
            </Card>
            <Card
                className={`relative h-full bg-card border-border hover:shadow-lg transition-shadow ${isCurrent("professional") ? "border-primary" : ""} ${isCurrent("professional") ? "cursor-default" : "cursor-pointer"} flex flex-col`}
                onClick={() => handleCardClick("professional")}
            >
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                        <Star className="h-3 w-3 mr-1"/>
                        Popular
                    </Badge>
                </div>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Star className="h-5 w-5 text-accent"/>
                            Professional
                        </CardTitle>
                        {isCurrent("professional") && (
                            <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                                Current Plan
                            </Badge>
                        )}
                        <div className="text-2xl font-bold">{displayPlanPrice("professional", planPrices)}</div>
                    </div>
                    <CardDescription>Great for growing teams</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                    <ul className="space-y-3 mb-6">
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span className="text-sm">Up to 10 projects</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span className="text-sm">Priority support</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span className="text-sm">50GB storage</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span className="text-sm">Team collaboration</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span className="text-sm">Advanced analytics</span>
                        </li>
                    </ul>
                    <Button className="mt-auto w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isCurrent("professional") || isReadOnly}>
                        {isCurrent("professional") ? "Current Plan" : isReadOnly ? "Read Only" : "Upgrade to Professional"}
                    </Button>
                </CardContent>
            </Card>
            <Card
                className={`relative h-full bg-card border-border hover:shadow-lg transition-shadow ${isCurrent("enterprise") ? "border-primary" : ""} ${isCurrent("enterprise") ? "cursor-default" : "cursor-pointer"} flex flex-col`}
                onClick={() => handleCardClick("enterprise")}
            >
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Zap className="h-5 w-5 text-accent"/>
                            Enterprise
                        </CardTitle>
                        {isCurrent("enterprise") && (
                            <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                                Current Plan
                            </Badge>
                        )}
                        <div className="text-2xl font-bold">{displayPlanPrice("enterprise", planPrices)}</div>
                    </div>
                    <CardDescription>For scale and custom requirements</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                    <ul className="space-y-3 mb-6">
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span className="text-sm">Unlimited projects</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span className="text-sm">24/7 dedicated support</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span className="text-sm">Custom storage</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span className="text-sm">Advanced integrations</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span className="text-sm">Custom workflows</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span className="text-sm">SSO & security</span>
                        </li>
                    </ul>
                    <Button variant="outline" className="mt-auto w-full bg-transparent" disabled={isCurrent("enterprise") || isReadOnly}>
                        {isCurrent("enterprise") ? "Current Plan" : isReadOnly ? "Read Only" : "Contact Sales"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
