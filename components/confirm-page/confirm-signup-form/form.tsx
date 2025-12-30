"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COOLDOWN_SECONDS = 60;
const LAST_SENT_KEY = "cognito_confirm_last_sent";

const getRemainingSeconds = (lastSent: number | null) => {
    if (!lastSent) {
        return 0;
    }
    const elapsed = Math.floor((Date.now() - lastSent) / 1000);
    return Math.max(0, COOLDOWN_SECONDS - elapsed);
};

const getConfirmErrorMessage = (error: string | null) => {
    switch (error) {
        case "missing_fields":
            return "Enter your email and verification code.";
        case "CodeMismatchException":
            return "Incorrect verification code.";
        case "ExpiredCodeException":
            return "Code expired. Request a new one.";
        case "UserNotFoundException":
            return "No account found for that email.";
        case "NotAuthorizedException":
            return "This account is already confirmed.";
        case "TooManyRequestsException":
            return "Too many attempts. Try again shortly.";
        case "confirm_failed":
            return "Unable to confirm your account.";
        default:
            return "";
    }
};

export const ConfirmSignupFormFields = () => {
    const searchParams = useSearchParams();
    const initialEmail = useMemo(() => searchParams.get("email") || "", [searchParams]);
    const [email, setEmail] = useState(initialEmail);
    const [remaining, setRemaining] = useState(0);
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");
    const emailInputRef = useRef<HTMLInputElement | null>(null);
    const confirmError = useMemo(
        () => getConfirmErrorMessage(searchParams.get("error")),
        [searchParams]
    );

    useEffect(() => {
        if (initialEmail && !email) {
            setEmail(initialEmail);
        }
    }, [email, initialEmail]);

    useEffect(() => {
        const sent = searchParams.get("sent") === "1";
        const stored = typeof window !== "undefined" ? window.localStorage.getItem(LAST_SENT_KEY) : null;
        const lastSent = stored ? Number(stored) : null;

        if (sent && !lastSent) {
            const now = Date.now();
            window.localStorage.setItem(LAST_SENT_KEY, String(now));
            setRemaining(COOLDOWN_SECONDS);
            return;
        }

        setRemaining(getRemainingSeconds(lastSent));
    }, [searchParams]);

    useEffect(() => {
        if (remaining <= 0) {
            return;
        }
        const timer = window.setInterval(() => {
            const stored = window.localStorage.getItem(LAST_SENT_KEY);
            const lastSent = stored ? Number(stored) : null;
            setRemaining(getRemainingSeconds(lastSent));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [remaining]);

    const handleResend = async () => {
        setStatus("");
        setError("");
        if (!email) {
            emailInputRef.current?.reportValidity();
            return;
        }
        const res = await fetch("/api/auth/resend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            const message = getConfirmErrorMessage(payload?.error) || "Failed to resend the code. Try again.";
            setError(message);
            return;
        }

        const now = Date.now();
        window.localStorage.setItem(LAST_SENT_KEY, String(now));
        setRemaining(COOLDOWN_SECONDS);
        setStatus("Verification code sent.");
    };

    return (
        <form className="p-6 md:p-8" action="/api/auth/confirm" method="post">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold">Confirm your email</h1>
                    <p className="text-balance text-muted-foreground">
                        Enter the verification code sent to your email
                    </p>
                </div>

                <div className="grid gap-3">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="m@example.com"
                        required
                        ref={emailInputRef}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                </div>

                <div className="grid gap-3">
                    <Label htmlFor="code">Verification code</Label>
                    <Input id="code" name="code" required />
                </div>

                {confirmError ? (
                    <div className="text-sm text-destructive" role="alert">
                        {confirmError}
                    </div>
                ) : null}

                <Button type="submit" className="w-full">
                    Confirm
                </Button>

                <div className="flex flex-col items-center gap-2 text-sm">
                    <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0"
                        onClick={handleResend}
                        disabled={remaining > 0}
                    >
                        {remaining > 0 ? `Resend code in ${remaining}s` : "Resend verification code"}
                    </Button>
                    {status ? <span className="text-muted-foreground">{status}</span> : null}
                    {error ? <span className="text-destructive">{error}</span> : null}
                </div>

                <div className="text-center text-sm">
                    Already confirmed?{" "}
                    <a href="/login" className="underline underline-offset-4">
                        Login
                    </a>
                </div>
            </div>
        </form>
    );
};
