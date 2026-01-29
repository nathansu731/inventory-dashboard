export const handleSubscribeTeam = async ({ priceId, customerEmail, clientReferenceId, metadata = {} }) => {
    try {
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
                metadata,
            }),
        });

        const data = await response.json();

        console.log("Response status:", response.status);
        console.log("Session response:", data);

        if (!response.ok) {
            throw new Error(data?.error || "Failed to create session");
        }

        if (data.url) {
            window.location.href = data.url;
        } else {
            throw new Error("No redirect URL returned");
        }
    } catch (err) {
        console.error("Error creating checkout session:", err);
        alert("Failed to redirect to checkout.");
    }
};
