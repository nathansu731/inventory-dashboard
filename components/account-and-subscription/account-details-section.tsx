import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Settings} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import type React from "react";

export const AccountDetailsSection = () => {
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
                                <span className="font-medium">Name:</span> John Doe
                            </p>
                            <p>
                                <span className="font-medium">Email:</span> john.doe@example.com
                            </p>
                            <p>
                                <span className="font-medium">Member since:</span> January 2024
                            </p>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-card-foreground mb-2">Current Plan</h3>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                                Team Plan
                            </Badge>
                            <span className="text-sm text-muted-foreground">Active</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Next billing: March 15, 2024</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}