import crypto from "crypto"
import {
  AdminCreateUserCommand,
  AdminGetUserCommand,
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

  return { error: null, cookiesToSet, idToken, tokenCtx }
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

const randomTemporaryPassword = () => {
  const base = crypto.randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "A")
  return `${base}aA1!`
}

export async function GET() {
  const ctx = await getContext()
  if (ctx.error) return withCookies(ctx.error, ctx.cookiesToSet)

  const tableName = getTenantsTableName()
  const region = resolveAwsRegion()
  if (!tableName || !region) {
    return withCookies(NextResponse.json({ error: "missing_tenants_config" }, { status: 500 }), ctx.cookiesToSet)
  }

  const ddb = new DynamoDBClient({ region })
  const tenantRecord = await getTenantRecord(ddb, tableName, ctx.tokenCtx.tenantId)
  if (!tenantRecord) {
    return withCookies(NextResponse.json({ error: "tenant_not_found" }, { status: 404 }), ctx.cookiesToSet)
  }

  const users = normalizeUsersMap(tenantRecord.users)
  const now = new Date().toISOString()
  if (!users[ctx.tokenCtx.sub] && ctx.tokenCtx.email) {
    users[ctx.tokenCtx.sub] = {
      userId: ctx.tokenCtx.sub,
      email: ctx.tokenCtx.email,
      firstName: ctx.tokenCtx.firstName,
      lastName: ctx.tokenCtx.lastName,
      role: "admin",
      inviteState: "accepted",
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      acceptedAt: now,
    }
    tenantRecord.users = users
    tenantRecord.updatedAt = now
    await putTenantRecord(ddb, tableName, tenantRecord)
  }

  const currentUserRole = roleForUser(users, ctx.tokenCtx.sub)
  const items = Object.values(users)
    .filter((user) => !user.isDeleted)
    .sort((a, b) => a.email.localeCompare(b.email))
    .map(formatUser)

  return withCookies(
    NextResponse.json({
      currentUserRole,
      canManageUsers: currentUserRole === "admin",
      summary: {
        total: items.length,
        admins: Object.values(users).filter((u) => !u.isDeleted && normalizeRole(u.role) === "admin").length,
        managers: Object.values(users).filter((u) => !u.isDeleted && normalizeRole(u.role) === "manager").length,
        activeAdmins: countActiveAdmins(users),
      },
      items,
    }),
    ctx.cookiesToSet
  )
}

export async function POST(request: Request) {
  const ctx = await getContext()
  if (ctx.error) return withCookies(ctx.error, ctx.cookiesToSet)

  const tableName = getTenantsTableName()
  const region = resolveAwsRegion()
  const userPoolId = process.env.COGNITO_USER_POOL_ID || ""
  if (!tableName || !region || !userPoolId) {
    return withCookies(NextResponse.json({ error: "missing_users_config" }, { status: 500 }), ctx.cookiesToSet)
  }

  const payload = (await request.json().catch(() => null)) as
    | { firstName?: string; lastName?: string; email?: string; role?: string }
    | null

  const firstName = typeof payload?.firstName === "string" ? payload.firstName.trim() : ""
  const lastName = typeof payload?.lastName === "string" ? payload.lastName.trim() : ""
  const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : ""
  const role = normalizeRole(payload?.role)

  if (!firstName || !lastName || !email) {
    return withCookies(NextResponse.json({ error: "missing_fields" }, { status: 400 }), ctx.cookiesToSet)
  }

  const ddb = new DynamoDBClient({ region })
  const tenantRecord = await getTenantRecord(ddb, tableName, ctx.tokenCtx.tenantId)
  if (!tenantRecord) {
    return withCookies(NextResponse.json({ error: "tenant_not_found" }, { status: 404 }), ctx.cookiesToSet)
  }

  const users = normalizeUsersMap(tenantRecord.users)
  const requesterRole = roleForUser(users, ctx.tokenCtx.sub)
  if (requesterRole !== "admin") {
    return withCookies(NextResponse.json({ error: "forbidden" }, { status: 403 }), ctx.cookiesToSet)
  }

  const duplicate = Object.values(users).some((user) => !user.isDeleted && user.email.toLowerCase() === email)
  if (duplicate) {
    return withCookies(NextResponse.json({ error: "email_already_in_tenant" }, { status: 409 }), ctx.cookiesToSet)
  }

  const cognito = new CognitoIdentityProviderClient({ region })
  try {
    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        TemporaryPassword: randomTemporaryPassword(),
        DesiredDeliveryMediums: ["EMAIL"],
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
          { Name: "given_name", Value: firstName },
          { Name: "family_name", Value: lastName },
          { Name: "custom:tenant_id", Value: ctx.tokenCtx.tenantId },
        ],
      })
    )
  } catch (error) {
    const name = error instanceof Error ? error.name : "invite_failed"
    return withCookies(NextResponse.json({ error: name }, { status: 400 }), ctx.cookiesToSet)
  }

  const userLookup = await cognito.send(
    new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: email,
    })
  )

  const sub = userLookup.UserAttributes?.find((attr) => attr.Name === "sub")?.Value || ""
  if (!sub) {
    return withCookies(NextResponse.json({ error: "missing_user_sub" }, { status: 502 }), ctx.cookiesToSet)
  }

  const now = new Date().toISOString()
  const created: TenantUserRecord = {
    userId: sub,
    email,
    firstName,
    lastName,
    role,
    inviteState: "sent",
    isActive: true,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    invitedBySub: ctx.tokenCtx.sub,
    invitedByEmail: ctx.tokenCtx.email,
  }

  users[sub] = created
  tenantRecord.users = users
  tenantRecord.updatedAt = now
  await putTenantRecord(ddb, tableName, tenantRecord)

  return withCookies(NextResponse.json(formatUser(created), { status: 201 }), ctx.cookiesToSet)
}
