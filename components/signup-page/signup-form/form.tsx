"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const getSignupErrorMessage = (error: string | null) => {
    switch (error) {
        case "missing_fields":
            return "Fill in all required fields.";
        case "password_mismatch":
            return "Passwords do not match.";
        case "missing_config":
            return "Sign up is not configured. Contact support.";
        case "UsernameExistsException":
            return "An account with this email already exists.";
        case "InvalidPasswordException":
            return "Password does not meet requirements.";
        case "InvalidParameterException":
            return "Check your details and try again.";
        case "TooManyRequestsException":
            return "Too many attempts. Try again shortly.";
        case "signup_failed":
            return "Unable to create account with that email.";
        default:
            return "";
    }
};

export const SignupFormFields = () => {
    const searchParams = useSearchParams();
    const errorMessage = useMemo(() => getSignupErrorMessage(searchParams.get("error")), [searchParams]);

    return (
        <form className="p-6 md:p-8" action="/api/auth/signup" method="post">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold">Create your account</h1>
                    <p className="text-balance text-muted-foreground">
                        Sign up to access the inventory dashboard
                    </p>
                </div>

                <div className="grid gap-3">
                    <Label htmlFor="firstName">First name</Label>
                    <Input id="firstName" name="first_name" required />
                </div>

                <div className="grid gap-3">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input id="lastName" name="last_name" required />
                </div>

                <div className="grid gap-3">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="m@example.com" required />
                </div>

                <div className="grid gap-3">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" type="password" required />
                </div>

                <div className="grid gap-3">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input id="confirmPassword" name="confirm_password" type="password" required />
                </div>

                {errorMessage ? (
                    <div className="text-sm text-destructive" role="alert">
                        {errorMessage}
                    </div>
                ) : null}

                <Button type="submit" className="w-full">
                    Sign up
                </Button>

                <div className="text-center text-sm">
                    Already have an account?{" "}
                    <a href="/login" className="underline underline-offset-4">
                        Login
                    </a>
                </div>
            </div>
        </form>
    );
};
