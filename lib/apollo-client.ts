import { ApolloClient, InMemoryCache, HttpLink, ApolloLink, from } from "@apollo/client";
import { onError } from "@apollo/client/link/error";

// Your GraphQL API endpoint
const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT as string;

// Middleware to attach JWT token from session cookie
const authLink = new ApolloLink((operation, forward) => {
    // On the server, we can call an API to get the latest token
    // On the client, token can be injected via /api/auth/refresh or js-cookie if needed
    return forward(operation).map((response) => {
        return response;
    });
});

// Error handling (optional but recommended)
const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
        graphQLErrors.forEach(({ message, locations, path }) => {
            console.error(
                `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
            );
        });
    }
    if (networkError) {
        console.error(`[Network error]: ${networkError}`);
    }
});

// Standard HTTP link
const httpLink = new HttpLink({
    uri: GRAPHQL_ENDPOINT,
    credentials: "include", // send cookies with requests
});

export function makeApolloClient(accessToken?: string) {
    const authMiddleware = new ApolloLink((operation, forward) => {
        if (accessToken) {
            operation.setContext(({ headers = {} }) => ({
                headers: {
                    ...headers,
                    Authorization: `Bearer ${accessToken}`,
                },
            }));
        }
        return forward(operation);
    });

    return new ApolloClient({
        link: from([errorLink, authMiddleware, authLink, httpLink]),
        cache: new InMemoryCache(),
    });
}