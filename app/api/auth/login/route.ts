import { NextRequest, NextResponse } from "next/server";
import { getIronSession, IronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { getCognitoClient } from "@/lib/openid-client";

export async function GET(req: NextRequest) {
    const res = NextResponse.next();

    // Explicitly type the session to include state/nonce/user
    const session: IronSession<SessionData> = await getIronSession<SessionData>(
        req,
        res,
        sessionOptions
    );

    const client = await getCognitoClient();

    // Generate state + nonce for security
    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();

    session.state = state;
    session.nonce = nonce;
    await session.save();

    // Build Cognito authorization URL
    const authUrl = client.authorizationUrl({
        scope: "openid email profile",
        state,
        nonce,
    });

    return NextResponse.redirect(authUrl);
}