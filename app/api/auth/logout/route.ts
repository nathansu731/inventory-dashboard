import { NextRequest, NextResponse } from "next/server";

const clearAuthCookies = (response: NextResponse) => {
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    };

    response.cookies.set("access_token", "", cookieOptions);
    response.cookies.set("id_token", "", cookieOptions);
    response.cookies.set("refresh_token", "", cookieOptions);
};

const buildHostedLogoutUrl = (req: NextRequest) => {
    const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "";
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "";
    const configuredLogoutUri = process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URI || "/login";

    if (!domain || !clientId) {
        return "";
    }

    const logoutUri = configuredLogoutUri.startsWith("/")
        ? new URL(configuredLogoutUri, req.url).toString()
        : configuredLogoutUri;

    const baseDomain = domain.endsWith("/oauth2") ? domain.slice(0, -"/oauth2".length) : domain;
    const logoutEndpoint = `${baseDomain}/logout`;
    const params = new URLSearchParams({
        client_id: clientId,
        logout_uri: logoutUri,
    });

    return `${logoutEndpoint}?${params.toString()}`;
};

export async function GET(req: NextRequest) {
    const hostedLogoutUrl = buildHostedLogoutUrl(req);
    const response = hostedLogoutUrl
        ? NextResponse.redirect(hostedLogoutUrl)
        : NextResponse.redirect(new URL("/login", req.url));

    clearAuthCookies(response);
    return response;
}

export async function POST(req: NextRequest) {
    return GET(req);
}
