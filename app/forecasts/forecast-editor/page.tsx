import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import {ForecastEditor} from "@/components/forecast-editor/forecast-editor";


export default function Page() {
    return (
        <SidebarProvider>
            <AppSidebar/>
            <SidebarInset>
                <SiteHeader />
                <ForecastEditor/>
            </SidebarInset>
        </SidebarProvider>
    )
}