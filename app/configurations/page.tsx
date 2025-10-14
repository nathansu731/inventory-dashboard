import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import {Configurations} from "@/components/configurations/configurations";

export const metadata = {
    title: "Configurations",
    description: 'Configurations',
}

export default function Page() {
    return (
        <SidebarProvider>
            <AppSidebar/>
            <SidebarInset>
                <SiteHeader />
                <Configurations/>
            </SidebarInset>
        </SidebarProvider>
    )
}