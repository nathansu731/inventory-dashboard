import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import {Kpis} from "@/components/kpis/kpis";

export const metadata = {
    title: 'KPIs',
    description: 'KPIs',
}

export default function Page() {
    return (
        <SidebarProvider>
            <AppSidebar/>
            <SidebarInset>
                <SiteHeader />
                <Kpis/>
            </SidebarInset>
        </SidebarProvider>
    )
}