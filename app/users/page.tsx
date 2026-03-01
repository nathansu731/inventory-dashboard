import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { UsersPage } from "@/components/users/users-page"

export const metadata = {
  title: "Manage Users",
  description: "Manage Users",
}

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <UsersPage />
      </SidebarInset>
    </SidebarProvider>
  )
}
