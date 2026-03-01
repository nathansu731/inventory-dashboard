import {
  AdminDisableUserCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { NextResponse } from "next/server"
import {
  countActiveAdmins,
  getTenantRecord,
  getTenantsTableName,
  getTokenUserContext,
  normalizeRole,
  normalizeUsersMap,
  putTenantRecord,
  resolveAwsRegion,
  roleForUser,
  toDisplayName,
  type TenantUserRecord,
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

const formatUser = (user: TenantUserRecord) => ({
  userId: user.userId,
  name: toDisplayName(user),
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: normalizeRole(user.role),
  inviteState: user.inviteState,
  isActive: user.isActive,
})

const ensureAdminAccess = (
  users: Record<string, TenantUserRecord>,
  requesterSub: string
): NextResponse | null => {
  const role = roleForUser(users, requesterSub)
  if (role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  return null
}

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
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

  const payload = (await request.json().catch(() => null)) as
    | { firstName?: string; lastName?: string; role?: string }
    | null

  const firstName = typeof payload?.firstName === "string" ? payload.firstName.trim() : ""
  const lastName = typeof payload?.lastName === "string" ? payload.lastName.trim() : ""
  const role = normalizeRole(payload?.role)
  if (!firstName || !lastName) {
    return withCookies(NextResponse.json({ error: "missing_fields" }, { status: 400 }), ctx.cookiesToSet)
  }

  const ddb = new DynamoDBClient({ region })
  const tenantRecord = await getTenantRecord(ddb, tableName, ctx.tokenCtx.tenantId)
  if (!tenantRecord) return withCookies(NextResponse.json({ error: "tenant_not_found" }, { status: 404 }), ctx.cookiesToSet)

  const users = normalizeUsersMap(tenantRecord.users)
  const authError = ensureAdminAccess(users, ctx.tokenCtx.sub)
  if (authError) return withCookies(authError, ctx.cookiesToSet)

  const existing = users[userId]
  if (!existing || existing.isDeleted) {
    return withCookies(NextResponse.json({ error: "not_found" }, { status: 404 }), ctx.cookiesToSet)
  }

  const activeAdmins = countActiveAdmins(users)
  const existingRole = normalizeRole(existing.role)
  if (existingRole === "admin" && role !== "admin" && existing.isActive && activeAdmins <= 1) {
    return withCookies(NextResponse.json({ error: "last_admin_cannot_be_demoted" }, { status: 409 }), ctx.cookiesToSet)
  }

  const cognito = new CognitoIdentityProviderClient({ region })
  await cognito.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: existing.email,
      UserAttributes: [
        { Name: "given_name", Value: firstName },
        { Name: "family_name", Value: lastName },
      ],
    })
  )

  const now = new Date().toISOString()
  const updated: TenantUserRecord = {
    ...existing,
    firstName,
    lastName,
    role,
    updatedAt: now,
  }

  users[userId] = updated
  tenantRecord.users = users
  tenantRecord.updatedAt = now
  await putTenantRecord(ddb, tableName, tenantRecord)

  return withCookies(NextResponse.json(formatUser(updated)), ctx.cookiesToSet)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
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
  const authError = ensureAdminAccess(users, ctx.tokenCtx.sub)
  if (authError) return withCookies(authError, ctx.cookiesToSet)

  const existing = users[userId]
  if (!existing || existing.isDeleted) {
    return withCookies(NextResponse.json({ error: "not_found" }, { status: 404 }), ctx.cookiesToSet)
  }

  const activeAdmins = countActiveAdmins(users)
  if (normalizeRole(existing.role) === "admin" && existing.isActive && activeAdmins <= 1) {
    return withCookies(NextResponse.json({ error: "last_admin_cannot_be_deleted" }, { status: 409 }), ctx.cookiesToSet)
  }

  const cognito = new CognitoIdentityProviderClient({ region })
  await cognito.send(
    new AdminDisableUserCommand({
      UserPoolId: userPoolId,
      Username: existing.email,
    })
  )

  const now = new Date().toISOString()
  users[userId] = {
    ...existing,
    isActive: false,
    isDeleted: true,
    updatedAt: now,
    deletedAt: now,
  }
  tenantRecord.users = users
  tenantRecord.updatedAt = now
  await putTenantRecord(ddb, tableName, tenantRecord)

  return withCookies(NextResponse.json({ ok: true }), ctx.cookiesToSet)
}
