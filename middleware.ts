import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/confirm", "/reset-password", "/api/auth", "/images"];

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

    if (!accessToken && !idToken) {
        const loginUrl = new URL("/login", req.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
