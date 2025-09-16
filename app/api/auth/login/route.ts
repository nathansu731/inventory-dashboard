import { NextRequest, NextResponse } from "next/server";
import { getCognitoClient } from "@/lib/auth/oidc-client";


export async function GET(req: NextRequest) {
    try {
        console.log("Login API called");

        const client = await getCognitoClient();
        console.log("Cognito client obtained:", !!client);

        // Require generators dynamically
        const { generators } = require("openid-client");
        const state = generators.state();
        const nonce = generators.nonce();

        console.log("Generated state & nonce:", state, nonce);

        const authUrl = client.authorizationUrl({
            scope: "openid email phone",
            state,
            nonce,
        });

        console.log("Auth URL generated:", authUrl);

        const response = NextResponse.json({ url: authUrl });
        response.cookies.set("oidc_state", state, { path: "/", httpOnly: true, sameSite: "lax" });
        response.cookies.set("oidc_nonce", nonce, { path: "/", httpOnly: true, sameSite: "lax" });

        return response;
    } catch (err: any) {
        console.error("Login API error:", err);
        console.error("Error message:", err.message);
        return NextResponse.json({ error: "Failed to generate login URL" }, { status: 500 });
    }
}