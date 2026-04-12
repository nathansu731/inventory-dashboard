import { NextRequest, NextResponse } from "next/server";
import { CognitoIdentityProviderClient, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
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

    const clientId = process.env.COGNITO_CLIENT_ID || process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "";
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

    const tenantId = crypto.randomUUID();
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
            { Name: "custom:tenant_id", Value: tenantId },
        ],
    });

    try {
        const result = await client.send(command);
        const tenantsTable = process.env.TENANTS_TABLE || "";
        if (tenantsTable) {
            try {
                const ddb = new DynamoDBClient({ region });
                const createdAt = new Date().toISOString();
                const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                await ddb.send(
                    new PutItemCommand({
                        TableName: tenantsTable,
                        Item: marshall({
                            tenantId,
                            name: `${String(firstName)} ${String(lastName)}`.trim(),
                            primaryUserEmail: String(email),
                            isOnboardingUser: true,
                            status: "trialing",
                            plan: "launch",
                            trialStartedAt: createdAt,
                            trialEndsAt,
                            createdAt,
                            users: result.UserSub
                                ? {
                                      [result.UserSub]: {
                                          userId: result.UserSub,
                                          email: String(email).toLowerCase(),
                                          firstName: String(firstName),
                                          lastName: String(lastName),
                                          role: "admin",
                                          inviteState: "sent",
                                          isActive: true,
                                          isDeleted: false,
                                          createdAt,
                                          updatedAt: createdAt,
                                      },
                                  }
                                : {},
                        }),
                        ConditionExpression: "attribute_not_exists(tenantId)",
                    }),
                );
            } catch {
                // best-effort; do not block signup if DynamoDB write fails
            }
        }
        const target = result.UserConfirmed
            ? "/login?signup=success"
            : `/confirm?email=${encodeURIComponent(String(email))}&sent=1`;
        return NextResponse.redirect(new URL(target, req.url));
    } catch (err) {
        const errorName = err instanceof Error ? err.name : "signup_failed";
        return NextResponse.redirect(new URL(`/signup?error=${encodeURIComponent(errorName)}`, req.url));
    }
}
