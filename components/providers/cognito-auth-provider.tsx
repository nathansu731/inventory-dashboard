"use client";

import React from "react";
import { AuthProvider, AuthProviderProps } from "react-oidc-context";

type Props = {
    children: React.ReactNode;
};

export default function CognitoAuthProvider({ children }: Props) {
    const oidcConfig: AuthProviderProps = {
        authority: process.env.NEXT_PUBLIC_COGNITO_AUTHORITY || "",
        client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "",
        redirect_uri:
            process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI || (typeof window !== "undefined" ? window.location.origin : ""),
        response_type: "code",
        scope: process.env.NEXT_PUBLIC_COGNITO_SCOPE || "openid profile email",
    };
    return <AuthProvider {...oidcConfig}>{children}</AuthProvider>;
}