import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import {DataInputPage} from "@/components/data-input-page/data-input-page";


export default function Page() {
    return (
        <SidebarProvider>
            <AppSidebar/>
            <SidebarInset>
                <SiteHeader />
                <DataInputPage/>
            </SidebarInset>
        </SidebarProvider>
    )
}