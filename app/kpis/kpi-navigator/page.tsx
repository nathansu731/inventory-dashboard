import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import {KpiNavigator} from "@/components/kpi-navigator/kpi-navigator";


export default function Page() {
    return (
        <SidebarProvider>
            <AppSidebar/>
            <SidebarInset>
                <SiteHeader />
                <KpiNavigator/>
            </SidebarInset>
        </SidebarProvider>
    )
}