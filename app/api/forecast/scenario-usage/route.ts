import { NextResponse } from "next/server"
import { getAuthenticatedApiContext } from "@/lib/server-auth"
import { getScenarioRunUsage } from "@/lib/scenario-run-usage"
import { normalizeTenantPlan } from "@/lib/upload-guardrails"

export async function GET() {
  const { cookiesToSet, errorResponse, tenantRecord } = await getAuthenticatedApiContext()
  if (errorResponse) return errorResponse

  const usage = getScenarioRunUsage({
    tenantRecord,
    plan: normalizeTenantPlan(tenantRecord?.plan),
  })
  const response = NextResponse.json(usage)
  for (const cookie of cookiesToSet) response.cookies.set(cookie.name, cookie.value, cookie.options)
  return response
}
