import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getTenantIdFromToken } from "@/lib/auth";
import { getAuthenticatedApiContext } from "@/lib/server-auth";
import { appendDataSourceAudit } from "@/lib/data-source-audit";
import { getTenantsTableName, resolveAwsRegion, writeTenantRecord } from "@/lib/data-sources";
import { consumeTenantRateLimit } from "@/lib/tenant-rate-limit";
import {
    buildRestrictionErrorPayload,
    getQuarantineUploadKey,
    MAX_UPLOAD_BYTES,
    normalizeTenantPlan,
    statusForRestrictionCode,
} from "@/lib/upload-guardrails";

const CSV_CONTENT_TYPES = new Set(["text/csv", "application/csv", "application/vnd.ms-excel", ""]);
const JSON_CONTENT_TYPES = new Set(["application/json"]);

const withCookies = (response: NextResponse, cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) => {
    for (const cookie of cookiesToSet) {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
    }
    return response;
};

export async function POST(req: Request) {
    const { idToken, cookiesToSet, errorResponse, tenantRecord, tokenCtx } = await getAuthenticatedApiContext();
    if (errorResponse || !idToken) return errorResponse!;

    const tenantId = getTenantIdFromToken(idToken);
    if (!tenantId) {
        return withCookies(
            NextResponse.json(buildRestrictionErrorPayload({
                code: "UPLOAD_KEY_NOT_ALLOWED",
                error: "Your tenant context could not be resolved for this upload request.",
            }), { status: 400 }),
            cookiesToSet,
        );
    }

    const bucket = process.env.S3_RAW_BUCKET || "";
    if (!bucket) {
        return withCookies(NextResponse.json({ error: "Upload storage is not configured on the server." }, { status: 500 }), cookiesToSet);
    }

    const tenantsTable = getTenantsTableName();
    const region = resolveAwsRegion();
    const ddb = tenantsTable && region ? new DynamoDBClient({ region }) : null;
    const persistTenantRecord = async () => {
        if (!tenantRecord || !ddb || !tenantsTable) return;
        tenantRecord.updatedAt = new Date().toISOString();
        await writeTenantRecord(ddb, tenantsTable, tenantRecord);
    };
    const rejectRequest = async ({
        code,
        error,
        status,
        details,
        retryAfterSeconds,
        auditType,
    }: {
        code: string;
        error: string;
        status?: number;
        details?: Record<string, unknown>;
        retryAfterSeconds?: number;
        auditType?: string;
    }) => {
        if (tenantRecord && tokenCtx && auditType) {
            appendDataSourceAudit({
                tenantRecord,
                type: auditType,
                actor: tokenCtx.email || tokenCtx.sub,
                actorType: "user",
                message: error,
            });
            await persistTenantRecord();
        }
        return withCookies(
            NextResponse.json(buildRestrictionErrorPayload({ code, error, details, retryAfterSeconds }), {
                status: status ?? statusForRestrictionCode(code),
            }),
            cookiesToSet,
        );
    };

    if (tenantRecord) {
        const plan = normalizeTenantPlan(tenantRecord.plan);
        const rateLimit = consumeTenantRateLimit({
            tenantRecord,
            action: "upload_url",
            plan,
        });
        if (!rateLimit.allowed) {
            return rejectRequest({
                code: "UPLOAD_RATE_LIMITED",
                error: `Too many upload attempts were made recently. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
                retryAfterSeconds: rateLimit.retryAfterSeconds,
                details: {
                    limit: rateLimit.limit,
                    windowSeconds: rateLimit.windowSeconds,
                },
                auditType: "upload_rate_limited",
            });
        }
        await persistTenantRecord();
    }

    const body = await req.json();
    const filename = body?.filename as string | undefined;
    const contentType = body?.contentType as string | undefined;
    const fileSize = Number(body?.fileSize ?? 0);

    if (!filename || !contentType) {
        return rejectRequest({
            code: "UPLOAD_KEY_NOT_ALLOWED",
            error: "Upload requests must include a filename, content type, and file size.",
            status: 400,
            auditType: "upload_rejected",
        });
    }

    const lowerFilename = filename.toLowerCase();
    const lowerContentType = contentType.toLowerCase();
    const isCsv = lowerFilename.endsWith(".csv");
    const isJson = lowerFilename.endsWith(".json");

    if (!isCsv && !isJson) {
        return rejectRequest({
            code: "UPLOAD_FILE_TYPE_NOT_ALLOWED",
            error: "Only CSV and JSON files can be uploaded here. Use CSV for sales history and inventory snapshots.",
            auditType: "upload_rejected",
        });
    }
    if ((isCsv && !CSV_CONTENT_TYPES.has(lowerContentType)) || (isJson && !JSON_CONTENT_TYPES.has(lowerContentType))) {
        return rejectRequest({
            code: "UPLOAD_CONTENT_TYPE_NOT_ALLOWED",
            error: "The uploaded file content type does not match the selected file extension.",
            auditType: "upload_rejected",
        });
    }
    if (Number.isFinite(fileSize) && fileSize > 0 && fileSize > MAX_UPLOAD_BYTES) {
        return rejectRequest({
            code: "UPLOAD_FILE_TOO_LARGE",
            error: "The uploaded file is too large. Limit uploads to 10MB or less.",
            status: 413,
            auditType: "upload_rejected",
        });
    }
    if (isCsv && (!Number.isFinite(fileSize) || fileSize <= 0)) {
        return rejectRequest({
            code: "UPLOAD_INVALID_FILE_SIZE",
            error: "The uploaded file size could not be verified. Please select the file again and retry.",
            auditType: "upload_rejected",
        });
    }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = getQuarantineUploadKey(tenantId, safeName);

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
        quarantine: true,
    });
    return withCookies(response, cookiesToSet);
}
