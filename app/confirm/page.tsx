import { ConfirmSignupForm } from "@/components/confirm-page/confirm-signup-form";
import { Suspense } from "react";

export default function ConfirmSignupPage() {
    return (
        <div className="flex min-h-svh items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-3xl">
                <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
                    <ConfirmSignupForm />
                </Suspense>
            </div>
        </div>
    );
}
