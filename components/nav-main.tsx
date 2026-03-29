"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
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

const DotWave = () => (
  <span className="ml-auto inline-flex items-center gap-0.5 text-muted-foreground" aria-hidden="true">
    <span className="h-1 w-1 rounded-full bg-current animate-pulse [animation-delay:0ms]" />
    <span className="h-1 w-1 rounded-full bg-current animate-pulse [animation-delay:120ms]" />
    <span className="h-1 w-1 rounded-full bg-current animate-pulse [animation-delay:240ms]" />
  </span>
)

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
  const [pendingParentUrl, setPendingParentUrl] = useState<string | null>(null)

  useEffect(() => {
    if (pendingParentUrl && currentPath === pendingParentUrl) {
      setPendingParentUrl(null)
    }
  }, [currentPath, pendingParentUrl])

  return (
      <SidebarGroup>
        <SidebarMenu>
          {items.map((item) => {
            const isSubItemActive = item.items?.some(
                (subItem) => subItem.url === currentPath
            )

            const isParentActive = item.url === currentPath

            const isActive = isSubItemActive || isParentActive
            const showPending = pendingParentUrl === item.url && currentPath !== item.url
            const shouldBeOpen = Boolean(item.items) && isActive

            return (
                <Collapsible
                    key={item.title}
                    asChild
                    open={shouldBeOpen}
                    className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      {item.url ? (
                          <Link href={item.url} onClick={() => setPendingParentUrl(item.url)}>
                            <SidebarMenuButton tooltip={item.title} className={isParentActive ? 'text-blue-600 font-medium cursor-pointer bg-sidebar-accent' : 'cursor-pointer'}>
                              {item.icon && <item.icon />}
                              <span className={isParentActive ? 'text-blue-600 font-medium' : ''}>
                              {item.title}
                              </span>
                              {item.items && (
                                  showPending ? (
                                      <DotWave />
                                  ) : (
                                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                  )
                              )}
                            </SidebarMenuButton>
                          </Link>
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
                                  <Link
                                      href={subItem.url}
                                      className={isSubActive ? '!text-blue-600 font-medium' : ''}
                                      onClick={() => setPendingParentUrl(null)}
                                  >
                                    <span>{subItem.title}</span>
                                  </Link>
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
