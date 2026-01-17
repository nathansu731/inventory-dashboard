"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { usePathname } from 'next/navigation'

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {

  const currentPath = usePathname()

  return (
      <SidebarGroup>
        <SidebarMenu>
          {items.map((item) => {
            const isSubItemActive = item.items?.some(
                (subItem) => subItem.url === currentPath
            )

            const isParentActive = item.url === currentPath

            const isActive = isSubItemActive || isParentActive

            return (
                <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={isActive}
                    className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      {item.url ? (
                          <a
                              href={item.url}
                          >
                            <SidebarMenuButton tooltip={item.title} className={isParentActive ? 'text-blue-600 font-medium cursor-pointer bg-sidebar-accent' : 'cursor-pointer'}>
                              {item.icon && <item.icon />}
                              <span className={isParentActive ? 'text-blue-600 font-medium' : ''}>
                              {item.title}
                              </span>
                              {item.items && (
                                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                              )}
                            </SidebarMenuButton>
                          </a>
                      ) : (
                          <SidebarMenuButton tooltip={item.title}>
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                            {item.items && (
                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            )}
                          </SidebarMenuButton>
                      )}
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => {
                          const isSubActive = subItem.url === currentPath
                          return (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton asChild className={isSubActive ? 'text-blue-600 font-medium bg-sidebar-accent' : ''}>
                                  <a
                                      href={subItem.url}
                                      className={isSubActive ? '!text-blue-600 font-medium' : ''}
                                  >
                                    <span>{subItem.title}</span>
                                  </a>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
            )
          })}
        </SidebarMenu>
      </SidebarGroup>
  )
}
