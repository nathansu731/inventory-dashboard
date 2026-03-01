import { Suspense } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ReplenishmentsPage } from "@/components/replenishments/replenishments-page"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export const metadata = {
  title: "Replenishments",
  description: "Replenishments",
}

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading replenishments...</div>}>
          <ReplenishmentsPage />
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  )
}
