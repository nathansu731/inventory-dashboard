import { NextRequest } from "next/server";
import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import crypto from "crypto";
import { getServerCognitoConfig } from "@/lib/server-runtime-config";
import { redirectAfterPost } from "@/lib/post-redirect";

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const username = formData.get("username");
    const password = formData.get("password");
    const requestedPath = String(formData.get("next") || "");
    const nextPath = requestedPath.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/overview";
    const loginError = (error: string) => {
        const url = new URL(`/login?error=${encodeURIComponent(error)}`, req.url);
        url.searchParams.set("next", nextPath);
        return redirectAfterPost(url);
    };

    if (!username || !password) {
        return loginError("missing_credentials");
    }

    let cognito;
    try {
        cognito = getServerCognitoConfig();
    } catch {
        return loginError("missing_config");
    }

    const authParams: Record<string, string> = {
        USERNAME: String(username),
        PASSWORD: String(password),
    };

    if (cognito.clientSecret) {
        const secretHash = crypto
            .createHmac("sha256", cognito.clientSecret)
            .update(`${username}${cognito.clientId}`)
            .digest("base64");
        authParams.SECRET_HASH = secretHash;
    }

    const client = new CognitoIdentityProviderClient({ region: cognito.region });
    const command = new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: cognito.clientId,
        AuthParameters: authParams,
    });

    let result;
    try {
        result = await client.send(command);
    } catch (err) {
        const errorName = err instanceof Error ? err.name : "unknown";
        return loginError(errorName);
    }

    const tokens = result.AuthenticationResult;
    if (!tokens?.AccessToken || !tokens?.IdToken) {
        return loginError("auth_challenge");
    }

    const response = redirectAfterPost(new URL(nextPath, req.url));
    response.cookies.set("access_token", tokens.AccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
        maxAge: tokens.ExpiresIn,
    });
    response.cookies.set("id_token", tokens.IdToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
        maxAge: tokens.ExpiresIn,
    });
    if (tokens.RefreshToken) {
        response.cookies.set("refresh_token", tokens.RefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            sameSite: "lax",
            maxAge: 30 * 24 * 60 * 60,
        });
    }

    return response;
}
