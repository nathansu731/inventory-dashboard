import { NextRequest, NextResponse } from "next/server";
import { getIronSession, IronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { getCognitoClient } from "@/lib/openid-client";

export async function GET(req: NextRequest) {
    const res = NextResponse.next();

    // Explicitly type the session so session.user is allowed
    const session: IronSession<SessionData> = await getIronSession<SessionData>(
        req,
        res,
        sessionOptions
    );

    if (!session.user?.refreshToken) {
        return NextResponse.json({ error: "No refresh token in session" }, { status: 401 });
    }

    try {
        const client = await getCognitoClient();
        const tokenSet = await client.refresh(session.user.refreshToken);

        if (!tokenSet.access_token) {
            // Clear session if refresh failed
            session.user = undefined;
            await session.save();
            return NextResponse.json({ error: "Failed to refresh access token" }, { status: 400 });
        }

        const expiresAt = Math.floor(Date.now() / 1000) + (tokenSet.expires_in ?? 3600);

        session.user = {
            accessToken: tokenSet.access_token,
            refreshToken: tokenSet.refresh_token ?? session.user.refreshToken,
            idToken: tokenSet.id_token,
            expiresAt,
        };

        await session.save();

        return NextResponse.json({ accessToken: session.user.accessToken, user: session.user });
    } catch (err) {
        console.error("Failed to refresh token", err);
        // Clear session on error
        session.user = undefined;
        await session.save();
        return NextResponse.json({ error: "Refresh failed" }, { status: 401 });
    }
}