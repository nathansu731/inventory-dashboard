import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "../../../lib/stripe";

const TRIAL_ELIGIBLE_PLANS = new Set(["launch", "professional"]);

const normalizePlanKey = (value) => {
    const plan = String(value || "").toLowerCase().trim();
    if (plan === "enterprise") return "enterprise";
    if (plan === "professional" || plan === "core" || plan === "pro") return "professional";
    if (plan === "launch" || plan === "free") return "launch";
    return "";
};

export async function POST(request) {
    try {
        const headersList = await headers();
        const origin = headersList.get("origin");

        const body = await request.json();
        const { price, mode, metadata, customerEmail, clientReferenceId, stripeCustomerId } = body;

        if (!price || !mode) {
            return NextResponse.json(
                { error: "Missing price or mode" },
                { status: 400 },
            );
        }

        const planKey = normalizePlanKey(metadata?.plan_key || metadata?.plan);
        let customerId = typeof stripeCustomerId === "string" && stripeCustomerId.startsWith("cus_")
            ? stripeCustomerId
            : "";

        if (!customerId && customerEmail) {
            const customerSearch = await stripe.customers.list({
                email: customerEmail,
                limit: 1,
            });
            customerId = customerSearch.data[0]?.id || "";
        }

        let existingSubscriptions = [];
        if (customerId) {
            const existing = await stripe.subscriptions.list({
                customer: customerId,
                status: "all",
                limit: 10,
            });
            existingSubscriptions = existing.data || [];
        }

        const activeOrTrialing = existingSubscriptions.find((sub) =>
            ["trialing", "active", "past_due", "unpaid"].includes(String(sub.status || "").toLowerCase())
        );
        const trialingSub = existingSubscriptions.find((sub) => String(sub.status || "").toLowerCase() === "trialing");
        const currentPriceId = activeOrTrialing?.items?.data?.[0]?.price?.id || "";
        const isPlanChangeDuringTrial = Boolean(trialingSub && currentPriceId && currentPriceId !== price);

        if (isPlanChangeDuringTrial && trialingSub?.id) {
            await stripe.subscriptions.cancel(trialingSub.id, { prorate: false, invoice_now: false });
        }

        const canApplyTrial =
            TRIAL_ELIGIBLE_PLANS.has(planKey) &&
            existingSubscriptions.length === 0 &&
            !isPlanChangeDuringTrial;

        const sessionPayload = {
            line_items: [
                {
                    price,
                    quantity: 1,
                },
            ],
            mode,
            customer: customerId || undefined,
            customer_email: customerId ? undefined : customerEmail || undefined,
            client_reference_id: clientReferenceId || undefined,
            metadata: metadata || undefined,
            success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/?canceled=true`,
        };

        if (mode === "subscription") {
            sessionPayload.subscription_data = {
                trial_period_days: canApplyTrial ? 30 : undefined,
                metadata: {
                    plan_key: planKey || undefined,
                },
            };
        }

        const session = await stripe.checkout.sessions.create(sessionPayload);

        return NextResponse.json({ url: session.url });
    } catch (err) {
        return NextResponse.json(
            { error: err.message },
            { status: err.statusCode || 500 },
        );
    }
}
