"use client";

import React from "react";
import { AuthProvider } from "react-oidc-context";
import { getClientOidcConfig } from "@/lib/public-runtime-config";

type Props = {
    children: React.ReactNode;
};

export default function CognitoAuthProvider({ children }: Props) {
    const oidcConfig = getClientOidcConfig();
    return <AuthProvider {...oidcConfig}>{children}</AuthProvider>;
}
