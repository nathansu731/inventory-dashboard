import { cookies as nextCookies } from "next/headers";
import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { getServerCognitoConfig } from "@/lib/server-runtime-config";
import { getSubscriptionAccessState, type SubscriptionAccessState } from "@/lib/subscription-state";
import {
    getTenantRecord,
    getTenantsTableName,
    getTokenUserContext,
    resolveAwsRegion,
    type TenantRecord,
    type TokenUserContext,
} from "@/lib/tenant-users";

export type CookieToSet = {
    name: string;
    value: string;
    options: {
        httpOnly: boolean;
        secure: boolean;
        path: string;
        maxAge?: number;
    };
};

type AuthenticatedApiContext = {
    accessState: SubscriptionAccessState | null;
    cookiesToSet: CookieToSet[];
    errorCode: "missing_tenant" | "trial_expired" | "unauthorized" | null;
    errorResponse: NextResponse | null;
    idToken: string | null;
    tenantRecord: TenantRecord | null;
    tokenCtx: TokenUserContext | null;
};

const authCookieNames = ["access_token", "id_token", "refresh_token"] as const;

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

const isExpired = (token: string, skewSeconds = 30) => {
    try {
        const payload = decodeJwtPayload(token);
        const exp = typeof payload.exp === "number" ? payload.exp : 0;
        const now = Math.floor(Date.now() / 1000);
        return exp > 0 && exp <= now + skewSeconds;
    } catch {
        return true;
    }
};

const refreshTokens = async (refreshToken: string) => {
    const cognito = getServerCognitoConfig();

    const body = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: cognito.clientId,
        refresh_token: refreshToken,
    });

    if (cognito.clientSecret) {
        body.append("client_secret", cognito.clientSecret);
    }

    const tokenRes = await fetch(cognito.tokenEndpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok) {
        throw new Error(tokens?.error || "refresh_failed");
    }

    return tokens as {
        access_token: string;
        id_token: string;
        refresh_token?: string;
    };
};

export const getValidIdToken = async () => {
    const cookieStore = await nextCookies();
    const idToken = cookieStore.get("id_token")?.value;
    const refreshToken = cookieStore.get("refresh_token")?.value;
    const secure = process.env.NODE_ENV === "production";

    const clearAuthCookies = (): CookieToSet[] =>
        authCookieNames.map((name) => ({
            name,
            value: "",
            options: { httpOnly: true, secure, path: "/", maxAge: 0 },
        }));

    if (idToken && !isExpired(idToken)) {
        return { idToken, cookiesToSet: [] as CookieToSet[] };
    }

    if (!refreshToken) {
        return { idToken: null, cookiesToSet: [] as CookieToSet[] };
    }

    try {
        const tokens = await refreshTokens(refreshToken);
        const cookiesToSet: CookieToSet[] = [
            {
                name: "access_token",
                value: tokens.access_token,
                options: { httpOnly: true, secure, path: "/" },
            },
            {
                name: "id_token",
                value: tokens.id_token,
                options: { httpOnly: true, secure, path: "/" },
            },
        ];

        if (tokens.refresh_token) {
            cookiesToSet.push({
                name: "refresh_token",
                value: tokens.refresh_token,
                options: { httpOnly: true, secure, path: "/" },
            });
        }

        return { idToken: tokens.id_token, cookiesToSet };
    } catch {
        const expiredCookies = clearAuthCookies();
        for (const cookie of expiredCookies) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
        }
        return { idToken: null, cookiesToSet: expiredCookies };
    }
};

export const withAuthCookies = <T extends NextResponse>(response: T, cookiesToSet: CookieToSet[]) => {
    for (const cookie of cookiesToSet) {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
    }
    return response;
};

export const getAuthenticatedApiContext = async (
    { allowRestricted = false }: { allowRestricted?: boolean } = {},
): Promise<AuthenticatedApiContext> => {
    const { idToken, cookiesToSet } = await getValidIdToken();
    if (!idToken) {
        return {
            accessState: null,
            cookiesToSet,
            errorCode: "unauthorized",
            errorResponse: withAuthCookies(NextResponse.json({ error: "unauthorized" }, { status: 401 }), cookiesToSet),
            idToken: null,
            tenantRecord: null,
            tokenCtx: null,
        };
    }

    const tokenCtx = getTokenUserContext(idToken);
    if (!tokenCtx) {
        return {
            accessState: null,
            cookiesToSet,
            errorCode: "missing_tenant",
            errorResponse: withAuthCookies(NextResponse.json({ error: "missing_tenant" }, { status: 403 }), cookiesToSet),
            idToken,
            tenantRecord: null,
            tokenCtx: null,
        };
    }

    const tableName = getTenantsTableName();
    const region = resolveAwsRegion();
    let tenantRecord: TenantRecord | null = null;

    if (tableName && region) {
        try {
            const ddb = new DynamoDBClient({ region });
            tenantRecord = await getTenantRecord(ddb, tableName, tokenCtx.tenantId);
        } catch {
            tenantRecord = null;
        }
    }

    const accessState = getSubscriptionAccessState({
        plan: tenantRecord?.plan,
        tenantStatus: tenantRecord?.status,
        subscriptionStatus: "",
        trialEndsAt: tenantRecord?.trialEndsAt,
    });

    if (tenantRecord && accessState.accessRestricted && !allowRestricted) {
        return {
            accessState,
            cookiesToSet,
            errorCode: "trial_expired",
            errorResponse: withAuthCookies(
                NextResponse.json(
                    {
                        error: "trial_expired",
                        upgradeHref: accessState.upgradeHref,
                        upgradeRequired: true,
                    },
                    { status: 402 },
                ),
                cookiesToSet,
            ),
            idToken,
            tenantRecord,
            tokenCtx,
        };
    }

    return {
        accessState,
        cookiesToSet,
        errorCode: null,
        errorResponse: null,
        idToken,
        tenantRecord,
        tokenCtx,
    };
};
