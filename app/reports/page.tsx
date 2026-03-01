import { Suspense } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import {ReportsPage} from "@/components/reports/reports";

export const metadata = {
    title: 'Reports',
    description: 'Reports',
}

export default function Page() {
    return (
        <SidebarProvider>
            <AppSidebar/>
            <SidebarInset>
                <SiteHeader />
                <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading reports...</div>}>
                    <ReportsPage/>
                </Suspense>
            </SidebarInset>
        </SidebarProvider>
    )
}
