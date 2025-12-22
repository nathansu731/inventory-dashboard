import { NextRequest, NextResponse } from "next/server";
import { CognitoIdentityProviderClient, ConfirmForgotPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
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
    const formData = await req.formData();
    const email = formData.get("email");
    const code = formData.get("code");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirm_password");

    if (!email || !code || !password || !confirmPassword) {
        const url = new URL("/reset-password?error=missing_fields", req.url);
        if (email) {
            url.searchParams.set("email", String(email));
        }
        return NextResponse.redirect(url);
    }

    if (password !== confirmPassword) {
        const url = new URL("/reset-password?error=password_mismatch", req.url);
        url.searchParams.set("email", String(email));
        return NextResponse.redirect(url);
    }

    const clientId = process.env.COGNITO_CLIENT_ID || "";
    const clientSecret = process.env.COGNITO_CLIENT_SECRET || "";
    const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "";
    const region = process.env.COGNITO_REGION || resolveRegion(domain);

    if (!clientId || !region) {
        const url = new URL("/reset-password?error=missing_config", req.url);
        url.searchParams.set("email", String(email));
        return NextResponse.redirect(url);
    }

    const secretHash = clientSecret
        ? crypto
              .createHmac("sha256", clientSecret)
              .update(`${email}${clientId}`)
              .digest("base64")
        : undefined;

    const client = new CognitoIdentityProviderClient({ region });
    const command = new ConfirmForgotPasswordCommand({
        ClientId: clientId,
        Username: String(email),
        ConfirmationCode: String(code),
        Password: String(password),
        SecretHash: secretHash,
    });

    try {
        await client.send(command);
        return NextResponse.redirect(new URL("/login?reset=success", req.url));
    } catch (err) {
        const errorName = err instanceof Error ? err.name : "reset_failed";
        const url = new URL("/reset-password", req.url);
        url.searchParams.set("error", errorName);
        url.searchParams.set("email", String(email));
        return NextResponse.redirect(url);
    }
}
