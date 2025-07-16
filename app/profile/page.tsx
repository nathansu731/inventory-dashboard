import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Separator} from "@/components/ui/separator";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import React from "react";
import {TokenGenerator} from "@/components/ui/token-generate";



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
                                {/* Personal Details Section */}
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
                                <Card className="gap-2">
                                    <CardHeader>
                                        <CardTitle>Personal Access Token</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <TokenGenerator />
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Personal Details</CardTitle>
                                        <CardDescription>Update your personal information and contact details</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="firstName">First Name</Label>
                                                <Input id="firstName" placeholder="Enter your first name" defaultValue="John" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="lastName">Last Name</Label>
                                                <Input id="lastName" placeholder="Enter your last name" defaultValue="Doe" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input id="email" type="email" placeholder="Enter your email" defaultValue="john.doe@example.com" />
                                        </div>
                                        <div className="flex justify-end">
                                            <Button>Save Changes</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                                {/* Reset Password Section */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Reset Password</CardTitle>
                                        <CardDescription>Change your password to keep your account secure</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="oldPassword">Old Password</Label>
                                            <Input id="oldPassword" type="password" placeholder="Enter your current password" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="newPassword">New Password</Label>
                                            <Input id="newPassword" type="password" placeholder="Enter your new password" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                            <Input id="confirmPassword" type="password" placeholder="Confirm your new password" />
                                        </div>
                                        <div className="flex justify-end">
                                            <Button>Update Password</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                            )
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}