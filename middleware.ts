import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/confirm", "/reset-password", "/terms", "/privacy", "/api/auth", "/images"];

const isPublicPath = (pathname: string) => {
    if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
        return true;
    }
    if (pathname.startsWith("/_next")) {
        return true;
    }
    if (pathname.startsWith("/images")) {
        return true;
    }
    return pathname === "/favicon.ico";
};

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (isPublicPath(pathname)) {
        return NextResponse.next();
    }

    const accessToken = req.cookies.get("access_token")?.value;
    const idToken = req.cookies.get("id_token")?.value;
    const refreshToken = req.cookies.get("refresh_token")?.value;

    // API routes refresh expired ID tokens from this cookie. Allow the request
    // through so the authenticated API layer can renew the session.
    if (!accessToken && !idToken && !refreshToken) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("next", `${pathname}${req.nextUrl.search}`);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
