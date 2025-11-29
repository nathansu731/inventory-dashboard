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

export default function Page() {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <SiteHeader/>
                <AccountAndSubscription/>
            </SidebarInset>
        </SidebarProvider>
    )
}