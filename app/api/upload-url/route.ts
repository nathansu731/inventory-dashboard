import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getTenantIdFromToken } from "@/lib/auth";
import { getValidIdToken } from "@/lib/server-auth";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(["text/csv", "application/csv", "application/vnd.ms-excel", ""]);

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
    const fileSize = Number(body?.fileSize ?? 0);

    if (!filename || !contentType) {
        return NextResponse.json({ error: "missing_params" }, { status: 400 });
    }

    if (!filename.toLowerCase().endsWith(".csv")) {
        return NextResponse.json({ error: "invalid_file_type_csv_only" }, { status: 400 });
    }
    if (!ALLOWED_CONTENT_TYPES.has(contentType.toLowerCase())) {
        return NextResponse.json({ error: "invalid_content_type_csv_only" }, { status: 400 });
    }
    if (!Number.isFinite(fileSize) || fileSize <= 0) {
        return NextResponse.json({ error: "invalid_file_size" }, { status: 400 });
    }
    if (fileSize > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: "file_too_large_max_10mb" }, { status: 413 });
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
