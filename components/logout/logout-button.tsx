"use client";

import { Button } from "@/components/ui/button";

export const LogoutButton = () => {
    const handleLogout = async () => {
        window.location.href = "/api/auth/logout";
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
