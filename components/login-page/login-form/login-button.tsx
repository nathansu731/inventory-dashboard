"use client";

import {Button} from "@/components/ui/button";

export const LoginButton = () => {

    const handleLogin = async () => {
        try {
            const res = await fetch(`${window.location.origin}/api/auth/login`);
            const data = await res.json();
            console.log("Login API response:", data);

            const { url } = data;

            if (url) {
                console.log("URL extracted from response:", url);
                window.location.href = url;
            } else {
                console.error("Login API response did not contain a URL.");
            }
        } catch (error) {
            console.error("Error during login process:", error);
        }
    };

    return (
        <Button onClick={handleLogin} type="submit" className="w-full">
            Login
        </Button>
    )
}