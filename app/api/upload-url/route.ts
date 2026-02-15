import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getTenantIdFromToken } from "@/lib/auth";
import { getValidIdToken } from "@/lib/server-auth";

export async function POST(req: Request) {
    const { idToken, cookiesToSet } = await getValidIdToken();
    if (!idToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const tenantId = getTenantIdFromToken(idToken);
    if (!tenantId) {
        return NextResponse.json({ error: "missing_tenant" }, { status: 400 });
    }

    const bucket = process.env.S3_RAW_BUCKET || "";
    if (!bucket) {
        return NextResponse.json({ error: "missing_bucket" }, { status: 500 });
    }

    const body = await req.json();
    const filename = body?.filename as string | undefined;
    const contentType = body?.contentType as string | undefined;

    if (!filename || !contentType) {
        return NextResponse.json({ error: "missing_params" }, { status: 400 });
    }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `tenant-raw/${tenantId}/uploads/${Date.now()}-${safeName}`;

    const client = new S3Client({});
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });

    const response = NextResponse.json({
        uploadUrl,
        s3Key: key,
        s3Bucket: bucket,
    });
    for (const cookie of cookiesToSet) {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
    }
    return response;
}
