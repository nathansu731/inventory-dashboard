import { AppSidebar } from "@/components/app-sidebar"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import {SiteHeader} from "@/components/site-header";
import {AccountAndSubscription} from "@/components/account-and-subscription/account-and-subscription";

export const metadata = {
    title: 'Account and Subscription',
    description: 'Subscribe',
}

export default async function Page({
    searchParams,
}: {
    searchParams?: Promise<{ upgrade?: string; step?: string; reason?: string }>
}) {
    const resolvedSearchParams = (await searchParams) ?? {}
    const upgrade =
        typeof resolvedSearchParams.upgrade === "string"
            ? resolvedSearchParams.upgrade
            : undefined
    const step =
        typeof resolvedSearchParams.step === "string"
            ? resolvedSearchParams.step
            : undefined
    const reason =
        typeof resolvedSearchParams.reason === "string"
            ? resolvedSearchParams.reason
            : undefined
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <SiteHeader/>
                <AccountAndSubscription
                    key={`${reason ?? ""}|${upgrade ?? ""}|${step ?? ""}`}
                    initialUpgradePlan={upgrade}
                    initialStep={step}
                    initialReason={reason}
                />
            </SidebarInset>
        </SidebarProvider>
    )
}
