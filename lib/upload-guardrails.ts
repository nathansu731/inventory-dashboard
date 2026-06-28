export type TenantPlan = "launch" | "professional" | "enterprise"

export type RestrictionErrorCode =
  | "EMPTY_UPLOAD"
  | "UNSAFE_CONTROL_CHARACTERS"
  | "CSV_HEADERS_OR_ROWS_MISSING"
  | "UPLOAD_COLUMNS_LIMIT_EXCEEDED"
  | "UPLOAD_ROWS_LIMIT_EXCEEDED"
  | "UPLOAD_HEADER_LENGTH_EXCEEDED"
  | "UPLOAD_CELL_LENGTH_EXCEEDED"
  | "DATE_COLUMN_MISSING"
  | "NO_VALID_DATES"
  | "HISTORY_WINDOW_EXCEEDED"
  | "SERIES_POINTS_LIMIT_EXCEEDED"
  | "PLAN_SERIES_LIMIT_EXCEEDED"
  | "UPLOAD_FILE_TYPE_NOT_ALLOWED"
  | "UPLOAD_CONTENT_TYPE_NOT_ALLOWED"
  | "UPLOAD_FILE_TOO_LARGE"
  | "UPLOAD_INVALID_FILE_SIZE"
  | "UPLOAD_RATE_LIMITED"
  | "FORECAST_START_RATE_LIMITED"
  | "SOURCE_SYNC_RATE_LIMITED"
  | "UPLOAD_KEY_NOT_ALLOWED"
  | "UPLOAD_PROMOTION_FAILED"
  | "PROVIDER_EXTRACTION_LIMIT_EXCEEDED"

export type RestrictionErrorPayload = {
  error: string
  code: RestrictionErrorCode | string
  details?: Record<string, unknown>
  helpCenterHref: string
  retryAfterSeconds?: number
}

export type FileGuardrailLimits = {
  maxRows: number
  maxSeries: number
  maxHistoryDays: number
  maxSeriesPoints: number
}

export type RateLimitAction = "upload_url" | "forecast_start" | "source_sync"

export const HELP_CENTER_HREF = "/help-center"
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const MAX_UPLOAD_COLUMNS = 40
export const MAX_CELL_CHARACTERS = 2000

const PLAN_FILE_LIMITS: Record<TenantPlan, FileGuardrailLimits> = {
  launch: {
    maxRows: 50_000,
    maxSeries: 250,
    maxHistoryDays: 365,
    maxSeriesPoints: 365,
  },
  professional: {
    maxRows: 150_000,
    maxSeries: 1_500,
    maxHistoryDays: 730,
    maxSeriesPoints: 730,
  },
  enterprise: {
    maxRows: 300_000,
    maxSeries: 5_000,
    maxHistoryDays: 730,
    maxSeriesPoints: 730,
  },
}

const RATE_LIMIT_RULES: Record<
  RateLimitAction,
  {
    windowSeconds: number
    maxRequests: Record<TenantPlan, number>
  }
> = {
  upload_url: {
    windowSeconds: 15 * 60,
    maxRequests: {
      launch: 8,
      professional: 16,
      enterprise: 30,
    },
  },
  forecast_start: {
    windowSeconds: 15 * 60,
    maxRequests: {
      launch: 4,
      professional: 8,
      enterprise: 16,
    },
  },
  source_sync: {
    windowSeconds: 15 * 60,
    maxRequests: {
      launch: 4,
      professional: 8,
      enterprise: 16,
    },
  },
}

export const normalizeTenantPlan = (value: unknown): TenantPlan => {
  const plan = String(value || "").toLowerCase().trim()
  if (plan === "enterprise") return "enterprise"
  if (plan === "professional" || plan === "core" || plan === "pro") return "professional"
  return "launch"
}

export const getPlanFileGuardrailLimits = (plan: TenantPlan) => PLAN_FILE_LIMITS[plan]

export const getRateLimitRule = (action: RateLimitAction, plan: TenantPlan) => ({
  windowSeconds: RATE_LIMIT_RULES[action].windowSeconds,
  maxRequests: RATE_LIMIT_RULES[action].maxRequests[plan],
})

export const buildRestrictionErrorPayload = ({
  code,
  error,
  details,
  retryAfterSeconds,
}: {
  code: RestrictionErrorCode | string
  error: string
  details?: Record<string, unknown>
  retryAfterSeconds?: number
}): RestrictionErrorPayload => ({
  error,
  code,
  details,
  helpCenterHref: HELP_CENTER_HREF,
  retryAfterSeconds,
})

export const statusForRestrictionCode = (code: string) => {
  if (code.includes("RATE_LIMITED")) return 429
  if (code === "UPLOAD_FILE_TOO_LARGE") return 413
  if (code === "UPLOAD_PROMOTION_FAILED") return 502
  return 400
}

export const getQuarantineUploadKey = (tenantId: string, safeName: string) =>
  `tenant-raw/${tenantId}/quarantine/uploads/${Date.now()}-${safeName}`

export const isTenantScopedRawKey = (tenantId: string, s3Key: string) =>
  s3Key.startsWith(`tenant-raw/${tenantId}/`)

export const isQuarantineUploadKey = (tenantId: string, s3Key: string) =>
  s3Key.startsWith(`tenant-raw/${tenantId}/quarantine/uploads/`)

export const promoteAcceptedUploadKey = (tenantId: string, s3Key: string) =>
  s3Key.replace(`tenant-raw/${tenantId}/quarantine/`, `tenant-raw/${tenantId}/accepted/`)
