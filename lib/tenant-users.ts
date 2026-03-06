import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb"
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb"
import { decodeJwtPayload, getTenantIdFromToken } from "@/lib/auth"

export type TenantUserRole = "admin" | "manager"
export type TenantInviteState = "sent" | "accepted"

export type TenantUserRecord = {
  userId: string
  email: string
  firstName: string
  lastName: string
  role: TenantUserRole
  inviteState: TenantInviteState
  isActive: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  invitedBySub?: string
  invitedByEmail?: string
  acceptedAt?: string
  deletedAt?: string
}

export type TenantRecord = Record<string, unknown> & {
  tenantId: string
  users?: Record<string, unknown>
}

export type TokenUserContext = {
  tenantId: string
  sub: string
  email: string
  firstName: string
  lastName: string
}

export const resolveAwsRegion = () =>
  process.env.AWS_REGION || process.env.COGNITO_REGION || ""

export const normalizeRole = (role: unknown): TenantUserRole => {
  const value = typeof role === "string" ? role.trim().toLowerCase() : ""
  return value === "manager" ? "manager" : "admin"
}

export const isActiveUser = (user: TenantUserRecord) => !user.isDeleted && user.isActive !== false

export const getTokenUserContext = (idToken: string): TokenUserContext | null => {
  const payload = decodeJwtPayload(idToken)
  const tenantId = getTenantIdFromToken(idToken)
  const sub = typeof payload.sub === "string" ? payload.sub : ""
  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : ""
  const firstName = typeof payload.given_name === "string" ? payload.given_name : ""
  const lastName = typeof payload.family_name === "string" ? payload.family_name : ""

  if (!tenantId || !sub) return null
  return { tenantId, sub, email, firstName, lastName }
}

const sanitizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "")

const sanitizeInviteState = (value: unknown): TenantInviteState =>
  value === "accepted" ? "accepted" : "sent"

export const normalizeTenantUser = (userId: string, raw: unknown): TenantUserRecord | null => {
  const input = typeof raw === "object" && raw ? (raw as Record<string, unknown>) : null
  if (!input) return null

  const email = sanitizeText(input.email).toLowerCase()
  if (!email) return null

  const now = new Date().toISOString()
  const firstName = sanitizeText(input.firstName)
  const lastName = sanitizeText(input.lastName)

  return {
    userId,
    email,
    firstName,
    lastName,
    role: normalizeRole(input.role),
    inviteState: sanitizeInviteState(input.inviteState),
    isActive: input.isActive !== false,
    isDeleted: input.isDeleted === true,
    createdAt: sanitizeText(input.createdAt) || now,
    updatedAt: sanitizeText(input.updatedAt) || now,
    invitedBySub: sanitizeText(input.invitedBySub) || undefined,
    invitedByEmail: sanitizeText(input.invitedByEmail) || undefined,
    acceptedAt: sanitizeText(input.acceptedAt) || undefined,
    deletedAt: sanitizeText(input.deletedAt) || undefined,
  }
}

export const normalizeUsersMap = (rawUsers: unknown): Record<string, TenantUserRecord> => {
  const input = typeof rawUsers === "object" && rawUsers ? (rawUsers as Record<string, unknown>) : {}
  const map: Record<string, TenantUserRecord> = {}

  for (const [userId, raw] of Object.entries(input)) {
    const normalized = normalizeTenantUser(userId, raw)
    if (normalized) map[userId] = normalized
  }
  return map
}

export const toDisplayName = (user: TenantUserRecord) => {
  const full = `${user.firstName} ${user.lastName}`.trim()
  return full || user.email
}

export const countActiveAdmins = (users: Record<string, TenantUserRecord>) =>
  Object.values(users).filter((user) => isActiveUser(user) && normalizeRole(user.role) === "admin").length

export const roleForUser = (users: Record<string, TenantUserRecord>, sub: string): TenantUserRole => {
  const user = users[sub]
  if (!user || user.isDeleted) return "admin"
  return normalizeRole(user.role)
}

export const getTenantsTableName = () => process.env.TENANTS_TABLE || ""

export const getTenantRecord = async (
  ddb: DynamoDBClient,
  tableName: string,
  tenantId: string
): Promise<TenantRecord | null> => {
  const result = await ddb.send(
    new GetItemCommand({
      TableName: tableName,
      Key: marshall({ tenantId }),
      ConsistentRead: true,
    })
  )

  if (!result.Item) return null
  return unmarshall(result.Item) as TenantRecord
}

export const putTenantRecord = async (
  ddb: DynamoDBClient,
  tableName: string,
  tenantRecord: TenantRecord
) => {
  await ddb.send(
    new PutItemCommand({
      TableName: tableName,
      Item: marshall(tenantRecord, { removeUndefinedValues: true }),
    })
  )
}
