export const handleSubscribeTeam = async ({ priceId, customerEmail, clientReferenceId, stripeCustomerId, metadata = {} }) => {
    if (!priceId) {
        throw new Error("Missing price id");
    }

    const response = await fetch("/api/checkout_sessions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            price: priceId,
            mode: "subscription",
            customerEmail,
            clientReferenceId,
            stripeCustomerId,
            metadata,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error || "Failed to create checkout session");
    }

    if (data.url) {
        window.location.href = data.url;
    } else {
        throw new Error("No redirect URL returned");
    }
};
