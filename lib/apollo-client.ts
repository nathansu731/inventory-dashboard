import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { getPublicGraphqlEndpoint } from "@/lib/public-runtime-config";

const client = new ApolloClient({
    link: new HttpLink({
        uri: getPublicGraphqlEndpoint(),
    }),
    cache: new InMemoryCache(),
});

export default client;
