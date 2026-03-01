import { AdminCreateUserCommand, CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { NextResponse } from "next/server"
import {
  getTenantRecord,
  getTenantsTableName,
  getTokenUserContext,
  normalizeUsersMap,
  putTenantRecord,
  resolveAwsRegion,
  roleForUser,
} from "@/lib/tenant-users"

type CookieToSet = { name: string; value: string; options: Record<string, unknown> }

const withCookies = (response: NextResponse, cookiesToSet: CookieToSet[]) => {
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  return response
}

const getContext = async () => {
  const { getValidIdToken } = await import("@/lib/server-auth")
  const { idToken, cookiesToSet } = await getValidIdToken()
  if (!idToken) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }), cookiesToSet, idToken: "" }
  }

  const tokenCtx = getTokenUserContext(idToken)
  if (!tokenCtx) {
    return { error: NextResponse.json({ error: "missing_tenant" }, { status: 403 }), cookiesToSet, idToken: "" }
  }
  return { error: null, cookiesToSet, tokenCtx }
}

export async function POST(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const ctx = await getContext()
  if (ctx.error) return withCookies(ctx.error, ctx.cookiesToSet)

  const tableName = getTenantsTableName()
  const region = resolveAwsRegion()
  const userPoolId = process.env.COGNITO_USER_POOL_ID || ""
  if (!tableName || !region || !userPoolId) {
    return withCookies(NextResponse.json({ error: "missing_users_config" }, { status: 500 }), ctx.cookiesToSet)
  }

  const { userId } = await params
  if (!userId) return withCookies(NextResponse.json({ error: "missing_user_id" }, { status: 400 }), ctx.cookiesToSet)

  const ddb = new DynamoDBClient({ region })
  const tenantRecord = await getTenantRecord(ddb, tableName, ctx.tokenCtx.tenantId)
  if (!tenantRecord) return withCookies(NextResponse.json({ error: "tenant_not_found" }, { status: 404 }), ctx.cookiesToSet)

  const users = normalizeUsersMap(tenantRecord.users)
  const requesterRole = roleForUser(users, ctx.tokenCtx.sub)
  if (requesterRole !== "admin") {
    return withCookies(NextResponse.json({ error: "forbidden" }, { status: 403 }), ctx.cookiesToSet)
  }

  const target = users[userId]
  if (!target || target.isDeleted) {
    return withCookies(NextResponse.json({ error: "not_found" }, { status: 404 }), ctx.cookiesToSet)
  }
  if (!target.isActive) {
    return withCookies(NextResponse.json({ error: "user_inactive" }, { status: 409 }), ctx.cookiesToSet)
  }
  if (target.inviteState !== "sent") {
    return withCookies(NextResponse.json({ error: "invite_already_accepted" }, { status: 409 }), ctx.cookiesToSet)
  }

  const cognito = new CognitoIdentityProviderClient({ region })
  await cognito.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: target.email,
      MessageAction: "RESEND",
    })
  )

  const now = new Date().toISOString()
  users[userId] = {
    ...target,
    updatedAt: now,
  }
  tenantRecord.users = users
  tenantRecord.updatedAt = now
  await putTenantRecord(ddb, tableName, tenantRecord)

  return withCookies(NextResponse.json({ ok: true }), ctx.cookiesToSet)
}
