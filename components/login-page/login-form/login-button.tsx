"use client";

import {Button} from "@/components/ui/button";


export const LoginButton = () => {
    const handleLogin = async () => {
        window.location.href = "/api/auth/login";
    };
    return (
        <Button type="submit" className="w-full" onClick={handleLogin}>
            Login
        </Button>
    )
}