import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import React from "react";


export const YourAccountAccess = () => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Your Account Access</CardTitle>
                <CardDescription>Give ARK support access to your account.<br/>We may need temporary access to diagnose and resolve a support issue you have raised. Access automatically expires after 1 week.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-end">
                    <Button>Approve ARK support access</Button>
                </div>
            </CardContent>
        </Card>
    )
}
