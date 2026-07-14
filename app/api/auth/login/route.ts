import { NextRequest } from "next/server";
import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import crypto from "crypto";
import { getServerCognitoConfig } from "@/lib/server-runtime-config";
import { redirectAfterPost } from "@/lib/post-redirect";

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const username = formData.get("username");
    const password = formData.get("password");

    if (!username || !password) {
        return redirectAfterPost(new URL("/login?error=missing_credentials", req.url));
    }

    let cognito;
    try {
        cognito = getServerCognitoConfig();
    } catch {
        return redirectAfterPost(new URL("/login?error=missing_config", req.url));
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
        const errorParam = encodeURIComponent(errorName);
        return redirectAfterPost(new URL(`/login?error=${errorParam}`, req.url));
    }

    const tokens = result.AuthenticationResult;
    if (!tokens?.AccessToken || !tokens?.IdToken) {
        return redirectAfterPost(new URL("/login?error=auth_challenge", req.url));
    }

    const response = redirectAfterPost(new URL("/overview", req.url));
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
