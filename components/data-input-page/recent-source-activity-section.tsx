type DataSourceAuditEvent = {
  id: string
  type: string
  actor: string
  actorType: "user" | "system"
  sourceId?: string
  provider?: string
  message: string
  createdAt: string
}

type RecentSourceActivitySectionProps = {
  auditEvents: DataSourceAuditEvent[]
}

export const RecentSourceActivitySection = ({ auditEvents }: RecentSourceActivitySectionProps) => {
  if (auditEvents.length === 0) return null
  return (
    <div className="mt-4 rounded-lg border p-4 text-sm">
      <div className="font-medium">Recent Source Activity</div>
      <div className="mt-2 space-y-2">
        {auditEvents.slice(0, 6).map((event) => (
          <div key={event.id} className="rounded-md bg-muted/40 p-2">
            <div className="text-sm">{event.message}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(event.createdAt).toLocaleString()} • {event.actorType === "system" ? "System" : event.actor}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
