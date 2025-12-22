import { NextRequest, NextResponse } from "next/server";
import { CognitoIdentityProviderClient, ResendConfirmationCodeCommand } from "@aws-sdk/client-cognito-identity-provider";
import crypto from "crypto";

const resolveRegion = (domain: string) => {
    try {
        const host = new URL(domain).host;
        const match = host.match(/auth\.([a-z0-9-]+)\.amazoncognito\.com/i);
        return match?.[1] || "";
    } catch {
        return "";
    }
};

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    const email = body?.email;

    if (!email) {
        return NextResponse.json({ error: "missing_email" }, { status: 400 });
    }

    const clientId = process.env.COGNITO_CLIENT_ID || "";
    const clientSecret = process.env.COGNITO_CLIENT_SECRET || "";
    const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "";
    const region = process.env.COGNITO_REGION || resolveRegion(domain);

    if (!clientId || !region) {
        return NextResponse.json({ error: "missing_config" }, { status: 400 });
    }

    const secretHash = clientSecret
        ? crypto
              .createHmac("sha256", clientSecret)
              .update(`${email}${clientId}`)
              .digest("base64")
        : undefined;

    const client = new CognitoIdentityProviderClient({ region });
    const command = new ResendConfirmationCodeCommand({
        ClientId: clientId,
        Username: String(email),
        SecretHash: secretHash,
    });

    try {
        await client.send(command);
        return NextResponse.json({ ok: true });
    } catch (err) {
        const errorName = err instanceof Error ? err.name : "resend_failed";
        return NextResponse.json({ error: errorName }, { status: 400 });
    }
}
