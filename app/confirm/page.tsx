import { ConfirmSignupForm } from "@/components/confirm-page/confirm-signup-form";

export default function ConfirmSignupPage() {
    return (
        <div className="flex min-h-svh items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-3xl">
                <ConfirmSignupForm />
            </div>
        </div>
    );
}
