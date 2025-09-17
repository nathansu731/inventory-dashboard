"use client";

import {
    ApolloClient,
    InMemoryCache,
    HttpLink,
    ApolloProvider,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { ReactNode } from "react";

interface Props {
    children: ReactNode;
}

export default function ApolloWrapper({ children }: Props) {
    const httpLink = new HttpLink({
        uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT,
        credentials: "include",
    });

    const authLink = setContext(async (_, { headers }) => {
        try {
            const res = await fetch("/api/auth/refresh", { method: "GET" });
            if (!res.ok) return { headers };

            const data = await res.json();
            const token = data?.accessToken;

            return {
                headers: {
                    ...headers,
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            };
        } catch (err) {
            console.error("Failed to fetch refresh token", err);
            return { headers };
        }
    });

    const client = new ApolloClient({
        link: authLink.concat(httpLink),
        cache: new InMemoryCache(),
    });

    return <ApolloProvider client={client}>{children}</ApolloProvider>;
}