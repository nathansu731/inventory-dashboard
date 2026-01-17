import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/store/providers";
import { ApolloWrapper } from "@/lib/apollo-provider";
import CognitoAuthProvider from "@/components/providers/cognito-auth-provider";
import React from "react";

export const metadata: Metadata = {
  title: "ARK Dashboard",
  description: "subscribe",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
        <body className="antialiased">
        <CognitoAuthProvider>
            <ApolloWrapper>
                <Providers>
                    {children}
                </Providers>
            </ApolloWrapper>
        </CognitoAuthProvider>
        </body>
        </html>
    );
}
