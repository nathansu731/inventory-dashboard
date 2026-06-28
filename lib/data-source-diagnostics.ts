import type { DataSourceDiagnostics, DataSourceProvider } from "@/lib/data-sources"
import { PROVIDER_BLUEPRINTS } from "@/lib/provider-source-config"

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)))

export const buildSourceDiagnostics = ({
  provider,
  grantedScopes = [],
  reachableTables = [],
  availableTables = [],
  selectedTables = [],
  statusSummary,
  userMessage,
  blockingIssues = [],
}: {
  provider: DataSourceProvider
  grantedScopes?: string[]
  reachableTables?: string[]
  availableTables?: string[]
  selectedTables?: string[]
  statusSummary?: string
  userMessage?: string
  blockingIssues?: string[]
}): DataSourceDiagnostics => {
  const blueprint = PROVIDER_BLUEPRINTS[provider]
  const reachable = unique(reachableTables.length > 0 ? reachableTables : availableTables)
  const required = unique([...blueprint.requiredEntities, ...selectedTables])
  const missing = required.filter((entity) => !reachable.includes(entity))

  return {
    authStyle: blueprint.authStyle,
    statusSummary: statusSummary || (missing.length > 0 ? "Connected with missing required entities" : "Connected and ready for configuration"),
    userMessage:
      userMessage ||
      (missing.length > 0
        ? `Connected, but ${missing.join(", ")} is not currently reachable with the granted permissions or account data.`
        : `Connected to ${blueprint.label}. Configure entities, date range, and field strategy before running compatibility preview.`),
    grantedScopes: unique(grantedScopes),
    reachableTables: reachable,
    missingTables: missing,
    blockingIssues: unique(blockingIssues),
    lastCheckedAt: new Date().toISOString(),
  }
}
