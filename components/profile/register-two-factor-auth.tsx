import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Checkbox} from "@/components/ui/checkbox";
import React from "react";


export const RegisterTwoFactorAuth = () => {
    return (
        <Card className="gap-1">
            <CardHeader>
                <CardTitle>Register Two-Factor Authenticator</CardTitle>
            </CardHeader>
            <CardContent className="mt-1">
                <div className="flex justify-end">
                    <Checkbox className="mt-1"/>
                    <CardDescription className="ml-2 ">Use a one-time password authenticator on
                        your mobile device or computer to enable two-factor authentication (2FA)</CardDescription>
                </div>
            </CardContent>
        </Card>
    )
}