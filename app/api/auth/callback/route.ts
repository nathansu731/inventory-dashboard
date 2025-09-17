import { NextRequest, NextResponse } from "next/server";
import { getIronSession, IronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { getCognitoClient } from "@/lib/openid-client";
import { storeTokenInSession } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
    const res = NextResponse.next();

    // Get session
    const session: IronSession<SessionData> = await getIronSession<SessionData>(
        req,
        res,
        sessionOptions
    );

    try {
        const url = new URL(req.url);
        const code = url.searchParams.get("code");
        const returnedState = url.searchParams.get("state");

        // Validate state
        if (!code || !returnedState || returnedState !== session.state) {
            return NextResponse.redirect(new URL("/login?error=invalid_state", req.url));
        }

        const client = await getCognitoClient();

        // Exchange code for tokens
        const tokenSet = await client.callback(
            `${url.origin}/api/auth/callback`,
            { code, state: returnedState },
            {
                nonce: session.nonce,
                state: session.state,
            }
        );

        // Store tokens in session
        await storeTokenInSession(req as any, tokenSet);

        // Clear state and nonce
        session.state = undefined;
        session.nonce = undefined;
        await session.save();

        // Redirect to home/dashboard
        return NextResponse.redirect(new URL("/", req.url));
    } catch (err) {
        console.error("Cognito callback error:", err);
        return NextResponse.redirect(new URL("/login?error=callback_failed", req.url));
    }
}