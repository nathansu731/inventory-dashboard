import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import {Separator} from "@/components/ui/separator";
import React from "react";
import {YourAccountAccess} from "@/components/profile/your-account-access";
import {RegisterTwoFactorAuth} from "@/components/profile/register-two-factor-auth";
import {PersonalAccessToken} from "@/components/profile/personal-access-token";
import {PersonalDetails} from "@/components/profile/personal-details";
import {ResetPassword} from "@/components/profile/reset-password";


export default function Page() {
    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col">
                    <div className="@container/main flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                            <div className="container mx-auto max-w-2xl p-6 space-y-8">
                                <div className="space-y-2">
                                    <h1 className="text-3xl font-bold">Profile Settings</h1>
                                    <p className="text-muted-foreground">Manage your account settings and preferences</p>
                                </div>
                                <Separator />
                                <YourAccountAccess/>
                                <RegisterTwoFactorAuth/>
                                <PersonalAccessToken/>
                                <PersonalDetails/>
                                <ResetPassword/>
                            </div>
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}