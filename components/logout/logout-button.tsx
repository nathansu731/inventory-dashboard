"use client";

import { Button } from "@/components/ui/button";

export const submitLogout = () => {
    const form = document.createElement("form");
    form.method = "post";
    form.action = "/api/auth/logout";
    document.body.appendChild(form);
    form.submit();
};

export const LogoutButton = () => {
    return (
        <div>
            <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex"
                onClick={submitLogout}
            >
                Logout
            </Button>
        </div>
    );
};
