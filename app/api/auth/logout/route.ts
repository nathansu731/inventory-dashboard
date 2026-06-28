import { NextRequest, NextResponse } from "next/server";
import { getServerCognitoConfig } from "@/lib/server-runtime-config";

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
    let cognito;
    try {
        cognito = getServerCognitoConfig();
    } catch {
        return "";
    }

    if (!cognito.logoutUri) {
        return "";
    }

    const logoutUri = cognito.logoutUri.startsWith("/")
        ? new URL(cognito.logoutUri, req.url).toString()
        : cognito.logoutUri;

    const params = new URLSearchParams({
        client_id: cognito.clientId,
        logout_uri: logoutUri,
    });

    return `${cognito.logoutEndpoint}?${params.toString()}`;
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
