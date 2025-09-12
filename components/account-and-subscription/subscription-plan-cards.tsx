import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Check, Crown, Star, Zap} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import type React from "react";
import {PlanType} from "@/components/account-and-subscription/plan-details-types";

type SubscriptionPlanCardsProps = {
    handlePlanClick: (plan: PlanType) => void
}

export const SubscriptionPlanCards = ({handlePlanClick, }: SubscriptionPlanCardsProps) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card
                className="relative bg-card border-border hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handlePlanClick("free")}
            >
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">Free</CardTitle>
                        <div className="text-2xl font-bold">$0</div>
                    </div>
                    <CardDescription>Perfect for getting started</CardDescription>
                </CardHeader>
                <CardContent>
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
                    <Button variant="outline" className="w-full bg-transparent">
                        View Details
                    </Button>
                </CardContent>
            </Card>
            <Card
                className="relative bg-card border-border hover:shadow-lg transition-shadow border-primary cursor-pointer"
                onClick={() => handlePlanClick("team")}
            >
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                        <Star className="h-3 w-3 mr-1"/>
                        Popular
                    </Badge>
                </div>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">Team</CardTitle>
                        <div className="text-2xl font-bold">$29</div>
                    </div>
                    <CardDescription>Great for small teams</CardDescription>
                </CardHeader>
                <CardContent>
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
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Upgrade to
                        Team</Button>
                </CardContent>
            </Card>
            <Card
                className="relative bg-card border-border hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handlePlanClick("enterprise")}
            >
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Zap className="h-5 w-5 text-accent"/>
                            Enterprise
                        </CardTitle>
                        <div className="text-2xl font-bold">$99</div>
                    </div>
                    <CardDescription>For growing businesses</CardDescription>
                </CardHeader>
                <CardContent>
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
                            <span className="text-sm">500GB storage</span>
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
                    <Button variant="outline" className="w-full bg-transparent">
                        Select Enterprise
                    </Button>
                </CardContent>
            </Card>
            <Card
                className="relative bg-card border-border hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handlePlanClick("custom")}
            >
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Crown className="h-5 w-5 text-accent"/>
                            Custom
                        </CardTitle>
                        <div className="text-2xl font-bold">Contact</div>
                    </div>
                    <CardDescription>Tailored to your needs</CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-3 mb-6">
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span className="text-sm">Everything in Enterprise</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span className="text-sm">Custom integrations</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span className="text-sm">Dedicated account manager</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span className="text-sm">On-premise deployment</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span className="text-sm">Custom SLA</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span className="text-sm">White-label options</span>
                        </li>
                    </ul>
                    <Button variant="outline" className="w-full bg-transparent">
                        Contact Sales
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}