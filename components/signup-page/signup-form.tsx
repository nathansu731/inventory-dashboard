import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { BgImageMuted } from "@/components/login-page/login-form/bg-image-muted";
import { TermsAndPrivacyPrompt } from "@/components/login-page/login-form/terms-and-privacy-prompt";
import { SignupFormFields } from "@/components/signup-page/signup-form/form";

export const SignupForm = ({ className, ...props }: React.ComponentProps<"div">) => {
    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="overflow-hidden p-0">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <SignupFormFields />
                    <BgImageMuted
                        src="/images/signup-forecasting.svg"
                        alt="Planning session with forecasting boards and data tables"
                    />
                </CardContent>
            </Card>
            <TermsAndPrivacyPrompt />
        </div>
    );
};
