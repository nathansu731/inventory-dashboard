"use client";

import { Button } from "@/components/ui/button";

export const LoginButton = () => {
    const handleLogin = () => {
        const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN!;
        const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
        const redirectUri = process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI!;
        const scope = encodeURIComponent(process.env.NEXT_PUBLIC_COGNITO_SCOPE!);
        const responseType = "code";

        window.location.href = `${domain}/login?client_id=${clientId}&response_type=${responseType}&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    };

    return (
        <Button type="button" className="w-full" onClick={handleLogin}>
            Login
        </Button>
    );
};