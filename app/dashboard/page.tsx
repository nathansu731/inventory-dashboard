import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {Header} from "@/components/dashboard/header";
import {DashboardBody} from "@/components/dashboard/dashboard";

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header/>
          <DashboardBody/>
      </SidebarInset>
    </SidebarProvider>
  )
}
