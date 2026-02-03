"use client"

import * as React from "react"
import {
  AudioWaveform,
  ChartNoAxesGantt,
  Command,
  GalleryVerticalEnd,
  TrendingUpDown,
  LayoutDashboard, FileChartColumn, Warehouse, Grid2x2Plus,
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

// This is sample data.
const data = {
  teams: [
    {
      name: "ARK Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
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
      url: "#",
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
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
