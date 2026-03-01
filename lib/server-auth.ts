import { cookies as nextCookies } from "next/headers";

type CookieToSet = {
    name: string;
    value: string;
    options: {
        httpOnly: boolean;
        secure: boolean;
        path: string;
        maxAge?: number;
    };
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
    const clientId = process.env.COGNITO_CLIENT_ID || "";
    const clientSecret = process.env.COGNITO_CLIENT_SECRET || "";
    const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "";
    const tokenEndpoint = domain.endsWith("/oauth2") ? `${domain}/token` : `${domain}/oauth2/token`;

    if (!clientId || !tokenEndpoint) {
        throw new Error("missing_cognito_config");
    }

    const body = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        refresh_token: refreshToken,
    });

    if (clientSecret) {
        body.append("client_secret", clientSecret);
    }

    const tokenRes = await fetch(tokenEndpoint, {
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
