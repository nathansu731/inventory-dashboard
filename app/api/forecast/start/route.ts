import { NextResponse } from "next/server";
import { appsyncRequest } from "@/lib/appsync";
import { getValidIdToken } from "@/lib/server-auth";

export async function POST(req: Request) {
    const { idToken, cookiesToSet } = await getValidIdToken();
    if (!idToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { s3Bucket, s3Key, originalFilename, adjustmentsKey, sku, store, frequency } = body || {};
    if (!s3Bucket || !s3Key) {
        return NextResponse.json({ error: "missing_s3" }, { status: 400 });
    }

    const query = `
      mutation StartForecastRun($input: StartForecastInput!) {
        startForecastRun(input: $input) {
          status
          message
          run {
            runId
            tenantId
            status
            createdAt
            updatedAt
            s3OutputPrefix
          }
        }
      }
    `;

    try {
        const json = await appsyncRequest(idToken, query, {
            input: {
                s3Bucket,
                s3Key,
                originalFilename,
                adjustmentsKey,
                sku,
                store,
                frequency,
            },
        });

        const response = NextResponse.json(json.data.startForecastRun);
        for (const cookie of cookiesToSet) {
            response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
        return response;
    } catch (err) {
        const message = err instanceof Error ? err.message : "appsync_error";
        return NextResponse.json({ error: message }, { status: 502 });
    }
}
