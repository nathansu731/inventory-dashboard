import { NextRequest, NextResponse } from "next/server";
import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const username = formData.get("username");
    const password = formData.get("password");

    if (!username || !password) {
        return NextResponse.redirect(new URL("/login?error=missing_credentials", req.url));
    }

    const clientId = process.env.COGNITO_CLIENT_ID || "";
    const clientSecret = process.env.COGNITO_CLIENT_SECRET || "";
    const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "";

    let region = process.env.COGNITO_REGION || "";
    if (!region && domain) {
        try {
            const host = new URL(domain).host;
            const match = host.match(/auth\.([a-z0-9-]+)\.amazoncognito\.com/i);
            region = match?.[1] || "";
        } catch {
            region = "";
        }
    }

    if (!clientId || !region) {
        return NextResponse.redirect(new URL("/login?error=missing_config", req.url));
    }

    const authParams: Record<string, string> = {
        USERNAME: String(username),
        PASSWORD: String(password),
    };

    if (clientSecret) {
        const secretHash = crypto
            .createHmac("sha256", clientSecret)
            .update(`${username}${clientId}`)
            .digest("base64");
        authParams.SECRET_HASH = secretHash;
    }

    const client = new CognitoIdentityProviderClient({ region });
    const command = new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: clientId,
        AuthParameters: authParams,
    });

    let result;
    try {
        result = await client.send(command);
    } catch (err) {
        const errorName = err instanceof Error ? err.name : "unknown";
        const errorParam = encodeURIComponent(errorName);
        return NextResponse.redirect(new URL(`/login?error=${errorParam}`, req.url));
    }

    const tokens = result.AuthenticationResult;
    if (!tokens?.AccessToken || !tokens?.IdToken) {
        return NextResponse.redirect(new URL("/login?error=auth_challenge", req.url));
    }

    const response = NextResponse.redirect(new URL("/overview", req.url));
    response.cookies.set("access_token", tokens.AccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
    });
    response.cookies.set("id_token", tokens.IdToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
    });
    if (tokens.RefreshToken) {
        response.cookies.set("refresh_token", tokens.RefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
        });
    }

    return response;
}
