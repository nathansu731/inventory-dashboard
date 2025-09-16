import { getCognitoClient } from "./oidc-client";

type TokenResult = {
    access_token?: string;
    id_token?: string;
    refresh_token?: string;
    expires_at?: number; // epoch seconds
    raw?: any; // original TokenSet (if you need extra fields)
};

export async function exchangeCodeForTokens(
    code: string,
    state?: string,
    nonce?: string
): Promise<TokenResult> {
    const client: any = await getCognitoClient();

    // params can also be client.callbackParams(req) if you pass full request - here we pass minimal
    const params = { code };

    const checks: any = {};
    if (state) checks.state = state;
    if (nonce) checks.nonce = nonce;

    // client.callback will validate signature, nonce, state (if provided in checks)
    const tokenSet = await client.callback(
        process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI!,
        params,
        checks
    );

    return {
        access_token: tokenSet.access_token,
        id_token: tokenSet.id_token,
        refresh_token: tokenSet.refresh_token,
        expires_at: tokenSet.expires_at, // epoch seconds
        raw: tokenSet,
    };
}

export async function refreshTokens(refreshToken: string): Promise<TokenResult | null> {
    const client: any = await getCognitoClient();
    try {
        const tokenSet = await client.refresh(refreshToken);
        return {
            access_token: tokenSet.access_token,
            id_token: tokenSet.id_token,
            refresh_token: tokenSet.refresh_token ?? refreshToken,
            expires_at: tokenSet.expires_at,
            raw: tokenSet,
        };
    } catch (err) {
        console.error("refreshTokens failed:", err);
        return null;
    }
}

export function isTokenExpired(expires_at?: number, leewaySeconds = 30) {
    if (!expires_at) return true;
    const nowSec = Math.floor(Date.now() / 1000);
    return expires_at < nowSec + leewaySeconds;
}