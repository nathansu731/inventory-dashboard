import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {TokenGenerator} from "@/components/ui/token-generate";
import React from "react";


export function PersonalAccessToken() {
    return (
        <Card className="gap-2">
            <CardHeader>
                <CardTitle>Personal Access Token</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <TokenGenerator />
            </CardContent>
        </Card>
    )
}