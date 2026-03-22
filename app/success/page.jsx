import { redirect } from "next/navigation";
import { stripe } from "../../lib/stripe";
import Link from "next/link";
import { AutoRedirect } from "./auto-redirect";

export default async function Success({ searchParams }) {
    const { session_id } = await searchParams;

    if (!session_id)
        throw new Error("Please provide a valid session_id (`cs_test_...`)");

    const {
        status,
        customer_details: { email: customerEmail },
    } = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ["line_items", "payment_intent"],
    });

    if (status === "open") {
        return redirect("/");
    }

    if (status === "complete") {
        return (
            <section className="w-full min-h-screen flex items-center justify-center py-20 md:py-32 bg-muted/30 relative overflow-hidden">
                <AutoRedirect delayMs={5000} />
                <div className="container px-4 md:px-6 relative max-w-2xl mx-auto text-center">
                    <div className="bg-black text-white rounded-xl shadow-lg p-8 md:p-12 border border-neutral-800">
                        <h1 className="text-2xl md:text-3xl font-semibold mb-4">
                            Thank You for Your Order!
                        </h1>
                        <p className="text-white/80 text-base md:text-lg mb-6">
                            We appreciate your business! A confirmation email will be sent to{" "}
                            {customerEmail}. If you have any questions, please email{" "}
                        </p>
                        <a
                            href="mailto:info@arkforecasting.com.au"
                            className="inline-block text-sm md:text-base font-medium text-primary hover:underline"
                        >
                            info@arkforecasting.com.au
                        </a>
                        <div className="mt-8">
                            <p className="text-sm text-white/70 mb-3">Your subscription is active. Redirecting to overview...</p>
                            <Link href="/overview" className="inline-block text-sm md:text-base font-medium text-primary hover:underline">
                                Go to Overview Now
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        );
    }
}
