"use client"

import * as React from "react"
import {
  AudioWaveform,
  ChartNoAxesGantt,
  Command,
  GalleryVerticalEnd,
  TrendingUpDown,
  LayoutDashboard, FileChartColumn, Warehouse, Grid2x2Plus, CreditCard,
} from "lucide-react"

import CustomKpiIcon from "@/components/custom-lucide-icons/kpi-icon";

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useProfile } from "@/hooks/use-profile"
import { getSubscriptionAccessState } from "@/lib/subscription-state"

const data = {
  teams: [
    {
      name: "ARK Dashboard",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Professional Workspace",
      logo: AudioWaveform,
      plan: "Professional",
    },
    {
      name: "Launch Workspace",
      logo: Command,
      plan: "Launch",
    },
  ],
  navMain: [
    {
      title: "Overview",
      url: "/overview",
      icon: ChartNoAxesGantt,
      isActive: true,
    },
    {
      title: "Forecasts",
      url: "/forecasts/forecasting-summary",
      icon: TrendingUpDown,
      items: [
        {
          title: "Forecast Navigator",
          url: "/forecasts/forecast-navigator",
        },
        {
          title: "Forecast Editor",
          url: "/forecasts/forecast-editor",
        },
      ],
    },
    {
      title: "KPIs",
      url: "/kpis",
      icon: CustomKpiIcon,
      items: [
        {
          title: "KPI Navigator",
          url: "/kpis/kpi-navigator",
        },
      ],
    },
    {
      title: "Dashboards",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: FileChartColumn,
      items: [
        {
          title: "Saved reports",
          url: "/reports/saved-reports",
        },
      ],
    },
    {
      title: "Replenishments",
      url: "/replenishments",
      icon: Warehouse,
    },
    {
      title: "Data Input",
      url: "/data-input",
      icon: Grid2x2Plus,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { profile } = useProfile()
  const accessState = getSubscriptionAccessState({
    plan: profile?.tenant_plan ?? profile?.["custom:plan"],
    tenantStatus: profile?.effective_tenant_status ?? profile?.tenant_status,
    subscriptionStatus: profile?.["custom:sub_status"],
    trialEndsAt: profile?.trial_ends_at,
  })
  const navItems = accessState.accessRestricted
    ? [
        {
          title: "Upgrade",
          url: "/account-and-subscription",
          icon: CreditCard,
          isActive: true,
        },
      ]
    : data.navMain

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
