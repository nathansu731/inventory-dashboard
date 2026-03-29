type ImportSummary = {
  status: "idle" | "running" | "success" | "error"
  message: string
}

type ImportSummarySectionProps = {
  summary: ImportSummary
}

export const ImportSummarySection = ({ summary }: ImportSummarySectionProps) => {
  if (summary.status === "idle") return null
  return (
    <div className="mt-4 rounded-lg border p-4 text-sm">
      <div className="font-medium">Connected Source Import</div>
      <div className="mt-1 text-muted-foreground">{summary.message}</div>
    </div>
  )
}
