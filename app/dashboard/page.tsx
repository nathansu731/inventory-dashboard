import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {DashboardBody} from "@/components/dashboard/dashboard";
import {SiteHeader} from "@/components/site-header";

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader/>
          <DashboardBody/>
      </SidebarInset>
    </SidebarProvider>
  )
}
