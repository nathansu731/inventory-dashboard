import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/auth/token-utils";

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        if (!code || !state) {
            return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
        }

        // Read stored state & nonce from cookies
        const storedState = req.cookies.get("oidc_state")?.value;
        const storedNonce = req.cookies.get("oidc_nonce")?.value;

        if (!storedState || state !== storedState) {
            return NextResponse.json({ error: "Invalid state" }, { status: 400 });
        }

        // Exchange code for tokens and validate nonce/state via openid-client
        const tokenRes = await exchangeCodeForTokens(code, storedState, storedNonce);

        if (!tokenRes || !tokenRes.access_token) {
            console.error("No tokens returned from exchange");
            return NextResponse.json({ error: "Token exchange failed" }, { status: 500 });
        }

        // Prepare cookie options
        const isProd = process.env.NODE_ENV === "production";
        const cookieOpts: any = {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: isProd,
        };

        // compute maxAge from expires_at (in seconds)
        const maxAgeSeconds =
            tokenRes.expires_at ? Math.max(0, tokenRes.expires_at - Math.floor(Date.now() / 1000)) : undefined;

        const response = NextResponse.redirect(new URL("/", req.url));

        // set access_token and id_token cookies with expiry if available
        if (typeof maxAgeSeconds === "number" && maxAgeSeconds > 0) {
            response.cookies.set("access_token", tokenRes.access_token!, { ...cookieOpts, maxAge: maxAgeSeconds });
            if (tokenRes.id_token) response.cookies.set("id_token", tokenRes.id_token, { ...cookieOpts, maxAge: maxAgeSeconds });
        } else {
            response.cookies.set("access_token", tokenRes.access_token!, cookieOpts);
            if (tokenRes.id_token) response.cookies.set("id_token", tokenRes.id_token, cookieOpts);
        }

        // set refresh token (longer lifetime). If you have a refresh token expiration policy, set accordingly.
        if (tokenRes.refresh_token) {
            const refreshMaxAge = 30 * 24 * 60 * 60; // 30 days (adjust as needed)
            response.cookies.set("refresh_token", tokenRes.refresh_token, { ...cookieOpts, maxAge: refreshMaxAge });
        }

        // Cleanup temporary cookies used for OIDC checks
        response.cookies.delete("oidc_state");
        response.cookies.delete("oidc_nonce");

        return response;
    } catch (err: any) {
        console.error("Callback error:", err);
        // If openid-client fails validation (nonce/state/signature), it will throw — handle gracefully
        return NextResponse.redirect(new URL("/?auth_error=1", req.url));
    }
}