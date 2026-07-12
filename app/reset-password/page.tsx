import { ResetPasswordForm } from "@/components/reset-password-page/reset-password-form";
import { ArkLoader } from "@/components/ark-loader/ark-loader";
import { Suspense } from "react";

export default function ResetPasswordPage() {
    return (
        <div className="flex min-h-svh items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-3xl">
                <Suspense
                    fallback={
                        <div className="flex justify-center">
                            <ArkLoader size={64} />
                        </div>
                    }
                >
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </div>
    );
}
