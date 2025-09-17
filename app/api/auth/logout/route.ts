import { NextRequest, NextResponse } from "next/server";
import { getIronSession, IronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";

export async function GET(req: NextRequest) {
    const res = NextResponse.next();

    // Get session and explicitly type it
    const session: IronSession<SessionData> = await getIronSession<SessionData>(
        req,
        res,
        sessionOptions
    );

    // Clear session
    session.user = undefined;
    session.state = undefined;
    session.nonce = undefined;
    await session.save();

    // Parse req.url string to URL object to get origin
    const fullUrl = new URL(req.url);
    const logoutRedirectUri =
        process.env.COGNITO_LOGOUT_REDIRECT_URI || `${fullUrl.origin}/`;

    const cognitoDomain = process.env.COGNITO_DOMAIN; // e.g., "https://your-pool-domain.auth.ap-southeast-2.amazoncognito.com"
    const clientId = process.env.COGNITO_CLIENT_ID;

    // Build Cognito logout URL
    const logoutUrl = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(
        logoutRedirectUri
    )}`;

    // Redirect to Cognito logout
    return NextResponse.redirect(logoutUrl);
}