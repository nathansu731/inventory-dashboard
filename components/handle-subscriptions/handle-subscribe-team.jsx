export const handleSubscribeTeam = async () => {
    try {
        const response = await fetch("/api/checkout_sessions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                price: "price_1SHNDwEyjMYH6Im3NXJrbCQq",
                mode: "subscription",
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