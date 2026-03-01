import { Suspense } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import {DataInputPage} from "@/components/data-input-page/data-input-page";

export const metadata = {
    title: 'Data Input',
    description: 'Data Input',
}

export default function Page() {
    return (
        <SidebarProvider>
            <AppSidebar/>
            <SidebarInset>
                <SiteHeader />
                <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading data input...</div>}>
                    <DataInputPage/>
                </Suspense>
            </SidebarInset>
        </SidebarProvider>
    )
}
