import { NextRequest, NextResponse } from "next/server";
import { CognitoIdentityProviderClient, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
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
    const firstName = formData.get("first_name");
    const lastName = formData.get("last_name");
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirm_password");

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        return NextResponse.redirect(new URL("/signup?error=missing_fields", req.url));
    }

    if (password !== confirmPassword) {
        return NextResponse.redirect(new URL("/signup?error=password_mismatch", req.url));
    }

    const clientId = process.env.COGNITO_CLIENT_ID || "";
    const clientSecret = process.env.COGNITO_CLIENT_SECRET || "";
    const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "";
    const region = process.env.COGNITO_REGION || resolveRegion(domain);

    if (!clientId || !region) {
        return NextResponse.redirect(new URL("/signup?error=missing_config", req.url));
    }

    const secretHash = clientSecret
        ? crypto
              .createHmac("sha256", clientSecret)
              .update(`${email}${clientId}`)
              .digest("base64")
        : undefined;

    const client = new CognitoIdentityProviderClient({ region });
    const command = new SignUpCommand({
        ClientId: clientId,
        Username: String(email),
        Password: String(password),
        SecretHash: secretHash,
        UserAttributes: [
            { Name: "email", Value: String(email) },
            { Name: "given_name", Value: String(firstName) },
            { Name: "family_name", Value: String(lastName) },
        ],
    });

    try {
        const result = await client.send(command);
        const target = result.UserConfirmed
            ? "/login?signup=success"
            : `/confirm?email=${encodeURIComponent(String(email))}&sent=1`;
        return NextResponse.redirect(new URL(target, req.url));
    } catch (err) {
        const errorName = err instanceof Error ? err.name : "signup_failed";
        return NextResponse.redirect(new URL(`/signup?error=${encodeURIComponent(errorName)}`, req.url));
    }
}
