import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "../../../lib/stripe";


export async function POST(request) {
    try {
        const headersList = await headers();
        const origin = headersList.get("origin");

        const body = await request.json();
        const { price, mode, metadata, customerEmail, clientReferenceId } = body;

        if (!price || !mode) {
            return NextResponse.json(
                { error: "Missing price or mode" },
                { status: 400 },
            );
        }

        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price,
                    quantity: 1,
                },
            ],
            mode,
            customer_email: customerEmail || undefined,
            client_reference_id: clientReferenceId || undefined,
            metadata: metadata || undefined,
            success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/?canceled=true`,
        });

        return NextResponse.json({ url: session.url });
    } catch (err) {
        return NextResponse.json(
            { error: err.message },
            { status: err.statusCode || 500 },
        );
    }
}
