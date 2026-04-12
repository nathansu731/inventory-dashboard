import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    getTenantRecord,
    getTenantsTableName,
    getTokenUserContext,
    normalizeRole,
    normalizeUsersMap,
    resolveAwsRegion,
    roleForUser,
} from "@/lib/tenant-users";

const decodeJwtPayload = (token: string) => {
    const parts = token.split(".");
    if (parts.length < 2) {
        throw new Error("invalid token");
    }
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = payload.length % 4;
    if (padding) {
        payload = payload.padEnd(payload.length + (4 - padding), "=");
    }
    const json = Buffer.from(payload, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
};

export async function GET(req: NextRequest) {
    const idToken = req.cookies.get("id_token")?.value;
    if (!idToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    try {
        const profile = decodeJwtPayload(idToken);
        let appRole: "admin" | "manager" = "admin";
        let tenantPlan: string | null = null;
        let tenantStatus: string | null = null;
        let trialEndsAt: string | null = null;

        const tokenCtx = getTokenUserContext(idToken);
        const tableName = getTenantsTableName();
        const region = resolveAwsRegion();
        if (tokenCtx && tableName && region) {
            const ddb = new DynamoDBClient({ region });
            const tenantRecord = await getTenantRecord(ddb, tableName, tokenCtx.tenantId);
            if (tenantRecord) {
                const users = normalizeUsersMap(tenantRecord.users);
                appRole = normalizeRole(roleForUser(users, tokenCtx.sub));
                tenantPlan = typeof tenantRecord.plan === "string" ? tenantRecord.plan : null;
                tenantStatus = typeof tenantRecord.status === "string" ? tenantRecord.status : null;
                trialEndsAt = typeof tenantRecord.trialEndsAt === "string" ? tenantRecord.trialEndsAt : null;
            }
        }

        return NextResponse.json(
            {
                profile: {
                    ...profile,
                    app_role: appRole,
                    tenant_plan: tenantPlan,
                    tenant_status: tenantStatus,
                    trial_ends_at: trialEndsAt,
                },
            },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            },
        );
    } catch {
        return NextResponse.json({ error: "invalid_token" }, { status: 401 });
    }
}
