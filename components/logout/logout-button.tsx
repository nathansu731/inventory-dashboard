"use client";

import { Button } from "@/components/ui/button";

export const LogoutButton = () => {
    const handleLogout = () => {
        const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN!;
        const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
        const logoutUri = process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URI!;

        window.location.href = `${domain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
    };

    return (
        <div>
            <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex"
                onClick={handleLogout}
            >
                Logout
            </Button>
        </div>
    );
};