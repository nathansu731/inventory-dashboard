import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import {ForecastNavigator} from "@/components/forecast-navigator/forecast-navigator";


export default function Page() {
    return (
        <SidebarProvider>
            <AppSidebar/>
            <SidebarInset>
                <SiteHeader />
                <ForecastNavigator/>
            </SidebarInset>
        </SidebarProvider>
    )
}