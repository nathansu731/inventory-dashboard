import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import React from "react";


export const YourAccountAccess = () => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Your Account Access</CardTitle>
                <CardDescription>Give Acme access to your account.<br/>We may need to temporarily access your account to diagnose and resolve a customer support issue you’ve raised. Our access automatically expires after 1 week.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-end">
                    <Button>Approve Acme support access</Button>
                </div>
            </CardContent>
        </Card>
    )
}