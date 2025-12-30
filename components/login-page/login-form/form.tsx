"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {WelcomeMessage} from "@/components/login-page/login-form/welcome-message";
import {EmailSection} from "@/components/login-page/login-form/email-section";
import {PasswordSection} from "@/components/login-page/login-form/password-section";
import {LoginButton} from "@/components/login-page/login-form/login-button";
import {ContinueWithSection} from "@/components/login-page/login-form/continue-with-section";
import {LoginWithOtherAccountBtns} from "@/components/login-page/login-form/login-with-other-account-btns";
import {DontHaveAccountSection} from "@/components/login-page/login-form/dont-have-account-section";

const getLoginErrorMessage = (error: string | null) => {
    switch (error) {
        case "missing_credentials":
            return "Enter your email and password.";
        case "NotAuthorizedException":
            return "Incorrect email or password.";
        case "UserNotFoundException":
            return "No account found for that email.";
        case "UserNotConfirmedException":
            return "Your email is not confirmed yet.";
        case "PasswordResetRequiredException":
            return "Password reset required. Use forgot password.";
        case "TooManyRequestsException":
            return "Too many attempts. Try again shortly.";
        case "oauth_failed":
            return "Social login failed. Please try again.";
        case "missing_config":
            return "Login is not configured. Contact support.";
        default:
            return "";
    }
};

export const Form = () => {
    const searchParams = useSearchParams();
    const errorMessage = useMemo(() => getLoginErrorMessage(searchParams.get("error")), [searchParams]);

    return (
        <form className="p-6 md:p-8" action="/api/auth/login" method="post">
            <div className="flex flex-col gap-6">
                <WelcomeMessage/>
                <EmailSection/>
                <PasswordSection/>
                {errorMessage ? (
                    <div className="text-sm text-destructive" role="alert">
                        {errorMessage}
                    </div>
                ) : null}
                <LoginButton/>
                <div className="hidden">
                    <ContinueWithSection/>
                </div>
                <div className="hidden">
                    <LoginWithOtherAccountBtns/>
                </div>
                <DontHaveAccountSection/>
            </div>
        </form>
    )
}
