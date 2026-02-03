"use client"

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Settings} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import type React from "react";
import { useProfile } from "@/hooks/use-profile";

const formatDate = (unixSeconds: number | undefined) => {
    if (!unixSeconds) return "--"
    return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
    })
}

export const AccountDetailsSection = () => {
    const { profile } = useProfile()
    const givenName = typeof profile?.given_name === "string" ? profile.given_name : ""
    const familyName = typeof profile?.family_name === "string" ? profile.family_name : ""
    const name = [givenName, familyName].filter(Boolean).join(" ")
        || (typeof profile?.name === "string" ? profile.name : "--")
    const email = typeof profile?.email === "string" ? profile.email : "--"
    const memberSince = typeof profile?.iat === "number" ? formatDate(profile.iat) : "--"
    const planRaw = typeof profile?.["custom:plan"] === "string" ? profile["custom:plan"] : ""
    const plan = planRaw ? planRaw.charAt(0).toUpperCase() + planRaw.slice(1) : "--"

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
                            <span className="text-sm text-muted-foreground">{plan === "--" ? "—" : "Active"}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Next billing: --</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
