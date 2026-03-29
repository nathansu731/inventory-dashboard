import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { HelpCenterPage } from "@/components/help-center/help-center-page"

export const metadata = {
  title: "Help Center",
  description: "Send your feedback and inquiries",
}

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <HelpCenterPage />
      </SidebarInset>
    </SidebarProvider>
  )
}
