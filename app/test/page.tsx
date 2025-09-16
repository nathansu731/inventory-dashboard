"use client";

import { useQuery } from '@apollo/client';
import { TEST_QUERY } from "@/lib/graphql/queries";

export default function TestPage() {
    const { data, loading, error } = useQuery(TEST_QUERY);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error.message}</p>;

    return (
        <div>
            <h1>GraphQL Test</h1>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
}