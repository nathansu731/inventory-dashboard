import { NextRequest, NextResponse } from "next/server";

const decodeJwtPayload = (token: string) => {
    const parts = token.split(".");
    if (parts.length < 2) {
        throw new Error("invalid token");
    }
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = payload.length % 4;
    if (padding) {
        payload = payload.padEnd(payload.length + (4 - padding), "=");
    }
    const json = Buffer.from(payload, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
};

export async function GET(req: NextRequest) {
    const idToken = req.cookies.get("id_token")?.value;
    if (!idToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    try {
        const profile = decodeJwtPayload(idToken);
        return NextResponse.json(
            { profile },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            },
        );
    } catch {
        return NextResponse.json({ error: "invalid_token" }, { status: 401 });
    }
}
