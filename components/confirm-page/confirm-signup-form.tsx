import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { BgImageMuted } from "@/components/login-page/login-form/bg-image-muted";
import { TermsAndPrivacyPrompt } from "@/components/login-page/login-form/terms-and-privacy-prompt";
import { ConfirmSignupFormFields } from "@/components/confirm-page/confirm-signup-form/form";

export const ConfirmSignupForm = ({ className, ...props }: React.ComponentProps<"div">) => {
    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="overflow-hidden p-0">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <ConfirmSignupFormFields />
                    <BgImageMuted
                        src="/images/confirm-forecasting.svg"
                        alt="Forecast approval with reports and validation check"
                    />
                </CardContent>
            </Card>
            <TermsAndPrivacyPrompt />
        </div>
    );
};
