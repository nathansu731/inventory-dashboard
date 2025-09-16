import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const accessToken = req.cookies.get("access_token")?.value;
        const body = await req.json();

        const upstream = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT!, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify(body),
        });

        const text = await upstream.text();

        try {
            const json = JSON.parse(text);
            return NextResponse.json(json, { status: upstream.status });
        } catch (e) {
            return new NextResponse(text, { status: upstream.status });
        }
    } catch (err: any) {
        console.error("GraphQL proxy error:", err);
        return NextResponse.json({ error: "GraphQL proxy error" }, { status: 500 });
    }
}