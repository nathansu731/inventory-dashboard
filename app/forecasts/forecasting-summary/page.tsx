import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import {ForecastingSummary} from "@/components/forecasting-summary/forecasting-summary";

export const metadata = {
    title: 'Forecasting summary',
    description: 'Forecasting summary',
}

export default function Page() {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <SiteHeader />
                <ForecastingSummary/>
            </SidebarInset>
        </SidebarProvider>
    )
}
