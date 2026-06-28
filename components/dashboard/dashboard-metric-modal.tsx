import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export type DashboardMetricInsight = {
  title: string
  value: string
  description: string
  bullets: string[]
  links?: Array<{ href: string; label: string }>
}

type DashboardMetricModalProps = {
  insight: DashboardMetricInsight | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DashboardMetricModal = ({ insight, open, onOpenChange }: DashboardMetricModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {insight ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-3">
                <span>{insight.title}</span>
                <Badge variant="outline" className="text-sm">{insight.value}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{insight.description}</p>
              <div className="space-y-2">
                {insight.bullets.map((bullet) => (
                  <div key={bullet} className="rounded-md border bg-muted/20 p-3 text-sm">
                    {bullet}
                  </div>
                ))}
              </div>
              {insight.links?.length ? (
                <div className="flex flex-wrap gap-2">
                  {insight.links.map((link) => (
                    <Button key={link.href} variant="outline" size="sm" asChild>
                      <Link href={link.href}>{link.label}</Link>
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
