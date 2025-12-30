import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
        return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const clientId = process.env.COGNITO_CLIENT_ID!;
    const clientSecret = process.env.COGNITO_CLIENT_SECRET || "";
    const redirectUri = process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI!;
    const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "";
    const tokenEndpoint = domain.endsWith("/oauth2") ? `${domain}/token` : `${domain}/oauth2/token`;

    const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        code,
        redirect_uri: redirectUri,
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
        return NextResponse.redirect(new URL("/login?error=oauth_failed", req.url));
    }

    const response = NextResponse.redirect(new URL("/overview", req.url));
    response.cookies.set("access_token", tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
    });
    response.cookies.set("id_token", tokens.id_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
    });
    if (tokens.refresh_token) {
        response.cookies.set("refresh_token", tokens.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
        });
    }

    return response;
}
