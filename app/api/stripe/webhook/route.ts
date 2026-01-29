import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import type Stripe from "stripe";

const cognitoRegion = process.env.COGNITO_REGION || "";
const userPoolId = process.env.COGNITO_USER_POOL_ID || "";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

const updateCognitoUser = async (email: string, attributes: Record<string, string>) => {
    if (!cognitoRegion || !userPoolId) {
        throw new Error("Missing Cognito configuration.");
    }

    const client = new CognitoIdentityProviderClient({ region: cognitoRegion });
    const command = new AdminUpdateUserAttributesCommand({
        UserPoolId: userPoolId,
        Username: email,
        UserAttributes: Object.entries(attributes).map(([Name, Value]) => ({ Name, Value })),
    });

    await client.send(command);
};

export async function POST(request: Request) {
    if (!webhookSecret) {
        return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
    }

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
        return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
    }

    const payload = await request.text();
    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Invalid signature";
        return NextResponse.json({ error: message }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const email =
            session.customer_email ||
            session.customer_details?.email ||
            (typeof session.metadata?.email === "string" ? session.metadata.email : "");
        const plan = typeof session.metadata?.plan === "string" ? session.metadata.plan : "";
        const planInterval = typeof session.metadata?.plan_interval === "string" ? session.metadata.plan_interval : "";
        const customerId = typeof session.customer === "string" ? session.customer : "";
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : "";

        if (email) {
            try {
                await updateCognitoUser(email, {
                    "custom:plan": plan || "unknown",
                    "custom:plan_interval": planInterval || "unknown",
                    "custom:stripe_cus_id": customerId || "unknown",
                    "custom:stripe_sub_id": subscriptionId || "unknown",
                    "custom:sub_status": "active",
                });
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to update Cognito user";
                return NextResponse.json({ error: message }, { status: 500 });
            }
        }
    }

    return NextResponse.json({ received: true });
}
