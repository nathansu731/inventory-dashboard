import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {Header} from "@/components/dashboard/header";
import {Body} from "@/components/dashboard/body";

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header/>
        <Body/>
      </SidebarInset>
    </SidebarProvider>
  )
}
