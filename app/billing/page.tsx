import { AppSidebar } from "@/components/app-sidebar"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { SiteHeader } from "@/components/site-header"
import { BillingPage } from "@/components/billing/billing-page"

export const metadata = {
    title: "Billing",
    description: "Billing",
}

export default function Page() {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <SiteHeader />
                <BillingPage />
            </SidebarInset>
        </SidebarProvider>
    )
}
