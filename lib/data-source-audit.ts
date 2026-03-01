import crypto from "crypto"
import type { DataSourceAuditEvent, DataSourceProvider, TenantRecord } from "@/lib/data-sources"
import { normalizeAuditEvents } from "@/lib/data-sources"

export const appendDataSourceAudit = ({
  tenantRecord,
  type,
  actor,
  actorType,
  sourceId,
  provider,
  message,
}: {
  tenantRecord: TenantRecord
  type: string
  actor: string
  actorType: "user" | "system"
  sourceId?: string
  provider?: DataSourceProvider
  message: string
}) => {
  const now = new Date().toISOString()
  const existing = normalizeAuditEvents(tenantRecord.dataSourceAudit)
  const next: DataSourceAuditEvent = {
    id: crypto.randomUUID(),
    type,
    actor: actor || "unknown",
    actorType,
    sourceId,
    provider,
    message,
    createdAt: now,
  }

  tenantRecord.dataSourceAudit = [next, ...existing].slice(0, 200)
}
