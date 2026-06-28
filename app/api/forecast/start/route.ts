import { NextResponse } from "next/server";
import { CopyObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { appsyncRequest } from "@/lib/appsync";
import { getAuthenticatedApiContext } from "@/lib/server-auth";
import { appendDataSourceAudit } from "@/lib/data-source-audit";
import { getTenantsTableName, resolveAwsRegion, writeTenantRecord } from "@/lib/data-sources";
import { consumeTenantRateLimit } from "@/lib/tenant-rate-limit";
import {
    buildRestrictionErrorPayload,
    isQuarantineUploadKey,
    isTenantScopedRawKey,
    normalizeTenantPlan,
    promoteAcceptedUploadKey,
    statusForRestrictionCode,
} from "@/lib/upload-guardrails";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const s3 = new S3Client({});

export async function POST(req: Request) {
    const { idToken, cookiesToSet, errorResponse, tenantRecord, tokenCtx } = await getAuthenticatedApiContext();
    if (errorResponse || !idToken) return errorResponse!;

    const withCookies = (response: NextResponse) => {
        for (const cookie of cookiesToSet) {
            response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
        return response;
    };

    const body = await req.json();
    const {
        s3Bucket,
        s3Key: requestedS3Key,
        originalFilename,
        adjustmentsKey,
        parentRunId,
        scenarioLabel,
        editedCellCount,
        sku,
        store,
        frequency,
        model,
        mode,
        seasonality,
        dateFormat,
        skuColumnName,
        storeColumnName,
        targetVariable,
        onHandColumnName,
        priceColumnName,
        holidayColumnName,
        promotionColumnName,
        openStatusColumnName,
        forecastHorizon,
        futureAssumptionsJson,
    } = body || {};
    if (!s3Bucket || !requestedS3Key) {
        return withCookies(NextResponse.json(buildRestrictionErrorPayload({
            code: "UPLOAD_KEY_NOT_ALLOWED",
            error: "The uploaded file reference is missing. Upload the file again before starting forecasting.",
        }), { status: 400 }));
    }

    const tenantId = tokenCtx?.tenantId || "";
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
        details,
        retryAfterSeconds,
        auditType,
        status,
    }: {
        code: string;
        error: string;
        details?: Record<string, unknown>;
        retryAfterSeconds?: number;
        auditType?: string;
        status?: number;
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
        return withCookies(NextResponse.json(buildRestrictionErrorPayload({ code, error, details, retryAfterSeconds }), {
            status: status ?? statusForRestrictionCode(code),
        }));
    };

    if (tenantRecord) {
        const plan = normalizeTenantPlan(tenantRecord.plan);
        const rateLimit = consumeTenantRateLimit({
            tenantRecord,
            action: "forecast_start",
            plan,
        });
        if (!rateLimit.allowed) {
            return rejectRequest({
                code: "FORECAST_START_RATE_LIMITED",
                error: `Too many forecast runs were started recently. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
                details: {
                    limit: rateLimit.limit,
                    windowSeconds: rateLimit.windowSeconds,
                },
                retryAfterSeconds: rateLimit.retryAfterSeconds,
                auditType: "forecast_start_rate_limited",
            });
        }
        await persistTenantRecord();
    }

    if (!tenantId || !isTenantScopedRawKey(tenantId, requestedS3Key)) {
        return rejectRequest({
            code: "UPLOAD_KEY_NOT_ALLOWED",
            error: "The selected upload does not belong to this workspace. Re-upload the file from this account and try again.",
            auditType: "forecast_start_rejected",
        });
    }

    let s3Key = requestedS3Key as string;
    if (isQuarantineUploadKey(tenantId, requestedS3Key)) {
        const acceptedKey = promoteAcceptedUploadKey(tenantId, requestedS3Key);
        try {
            await s3.send(
                new CopyObjectCommand({
                    Bucket: s3Bucket,
                    CopySource: `${s3Bucket}/${requestedS3Key}`,
                    Key: acceptedKey,
                    MetadataDirective: "COPY",
                }),
            );
            s3Key = acceptedKey;
        } catch {
            return rejectRequest({
                code: "UPLOAD_PROMOTION_FAILED",
                error: "The uploaded file could not be promoted from quarantine for processing. Please re-upload the file and try again.",
                auditType: "forecast_start_rejected",
                status: 502,
            });
        }
    }

    const query = `
      mutation StartForecastRun($input: StartForecastInput!) {
        startForecastRun(input: $input) {
          status
          message
          result
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
            parentRunId,
            scenarioLabel,
            editedCellCount,
            sku,
            store,
            frequency,
                model,
                mode,
                seasonality,
                dateFormat,
                skuColumnName,
                storeColumnName,
                targetVariable,
                onHandColumnName,
                priceColumnName,
                holidayColumnName,
                promotionColumnName,
                openStatusColumnName,
                forecastHorizon,
                futureAssumptionsJson,
            }
        });

        const startResult = json.data.startForecastRun;
        if (startResult?.status === "error") {
            const resultPayload =
                typeof startResult.result === "string"
                    ? (() => {
                        try {
                            return JSON.parse(startResult.result) as Record<string, unknown>;
                        } catch {
                            return {};
                        }
                    })()
                    : typeof startResult.result === "object" && startResult.result
                        ? (startResult.result as Record<string, unknown>)
                        : {};
            return rejectRequest({
                code: String(resultPayload.code || "UPLOAD_KEY_NOT_ALLOWED"),
                error: String(startResult.message || "Forecasting could not be started for this file."),
                details: resultPayload,
                auditType: "forecast_start_rejected",
                status: statusForRestrictionCode(String(resultPayload.code || "UPLOAD_KEY_NOT_ALLOWED")),
            });
        }
        return withCookies(NextResponse.json(startResult));
    } catch (err) {
        const message = err instanceof Error ? err.message : "appsync_error";
        return withCookies(NextResponse.json(buildRestrictionErrorPayload({
            code: "UPLOAD_PROMOTION_FAILED",
            error: `The forecast request could not be queued right now. ${message === "appsync_error" ? "Please try again." : message}`,
        }), { status: 502 }));
    }
}
