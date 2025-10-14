import { AppSidebar } from "@/components/app-sidebar"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import {NotificationsPage} from "@/components/notifications/notifications-page";
import {SiteHeader} from "@/components/site-header";

export const metadata = {
    title: 'Notifications',
    description: 'Notifications',
}

export default function Page() {
    return (
        <SidebarProvider>
            <AppSidebar/>
            <SidebarInset>
                <SiteHeader />
                <NotificationsPage/>
            </SidebarInset>
        </SidebarProvider>
    )
}