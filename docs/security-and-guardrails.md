# Security And Guardrails

This document summarizes the main restrictions, access controls, and safety measures currently implemented across the forecasting app frontend and backend.

Scope:
- Frontend: `inventory-dashboard`
- Backend / orchestration: `forecasting-core`

This reflects the current state of the application as implemented in the recent hardening work. It is intended as an internal operational reference, not a customer-facing policy document.

## 1. Authentication And Tenant Isolation

Implemented controls:
- API routes require authenticated Cognito tokens before protected actions are allowed.
- Expired ID tokens are refreshed server-side using the refresh token when possible.
- Invalid or expired auth state is cleared by removing auth cookies.
- API routes derive the tenant context from the authenticated token and reject requests without a valid tenant.
- Upload and forecast-start paths validate that raw S3 keys belong to the current tenant before processing.

Key files:
- `inventory-dashboard/lib/server-auth.ts`
- `inventory-dashboard/lib/auth.ts`
- `inventory-dashboard/app/api/upload-url/route.ts`
- `inventory-dashboard/app/api/forecast/start/route.ts`

Practical effect:
- A user cannot reuse another tenant’s upload key or start a forecast run against another tenant’s raw data prefix.

## 2. Subscription And Trial Access Restrictions

Implemented controls:
- Restricted tenants are blocked server-side when a trial is expired and no paid access is active.
- Frontend access and upgrade flows are guided using normalized subscription/trial state.
- Plan normalization is consistent across the app: `launch`, `professional`, `enterprise`.

Key files:
- `inventory-dashboard/lib/subscription-state.ts`
- `inventory-dashboard/lib/server-auth.ts`
- `forecasting-core/src/orchestrator/lib/handlers.js`

Practical effect:
- Protected app functions are not relying only on frontend gating. The backend also enforces restricted access conditions.

## 3. User Roles And Administrative Permissions

Implemented controls:
- Tenant user administration actions are restricted to admins.
- Managers cannot run admin-only actions such as source management and user management changes.
- Current-user state and invite acceptance state are normalized in the user management flow.

Key files:
- `inventory-dashboard/lib/tenant-users.ts`
- `inventory-dashboard/app/api/users/route.ts`
- `inventory-dashboard/app/api/data-sources/[sourceId]/sync/route.ts`

Practical effect:
- Operationally sensitive actions are role-gated, not only visually disabled in the UI.

## 4. Upload File-Type And Size Restrictions

Implemented controls:
- Main forecast upload accepts CSV only.
- Inventory snapshot upload accepts CSV only.
- Upload URL API accepts CSV and JSON only where relevant.
- Content type must match the extension.
- Maximum upload size is `10 MB`.
- CSV files with empty or invalid size metadata are rejected at upload URL issuance.

Key files:
- `inventory-dashboard/components/data-input-page/file-upload-section.tsx`
- `inventory-dashboard/components/data-input-page/use-data-input-controller.ts`
- `inventory-dashboard/app/api/upload-url/route.ts`
- `inventory-dashboard/lib/upload-guardrails.ts`

Practical effect:
- The app rejects unrelated file types before they enter the forecasting pipeline.

## 5. CSV Structure And Content Guardrails

Implemented controls:
- Empty CSVs are rejected.
- CSVs with unsupported control characters or binary-like content are rejected.
- CSVs must contain a header row and at least one data row.
- Maximum columns: `40`.
- Maximum cell length: `2000` characters.
- Unusually long headers are rejected.

Key files:
- `inventory-dashboard/components/data-input-page/use-data-input-controller.ts`
- `forecasting-core/src/orchestrator/lib/handlers.js`

Practical effect:
- The app blocks many malformed, abusive, or clearly unrelated CSV payloads before forecasting begins.

## 6. Plan-Based Dataset Limits

Implemented controls:

### Launch
- Max rows: `50,000`
- Max series: `250`
- Max history span: `365` days
- Max points per SKU-location series: `365`

### Professional
- Max rows: `150,000`
- Max series: `1,500`
- Max history span: `730` days
- Max points per SKU-location series: `730`

### Enterprise
- Max rows: `300,000`
- Max series: `5,000`
- Max history span: `730` days
- Max points per SKU-location series: `730`

Key files:
- `inventory-dashboard/lib/upload-guardrails.ts`
- `inventory-dashboard/components/data-input-page/use-data-input-controller.ts`
- `forecasting-core/src/orchestrator/lib/handlers.js`
- `inventory-dashboard/lib/data-source-extraction.ts`

Practical effect:
- The app limits ingestion scope by plan and prevents very large or long-running datasets from entering forecasting blindly.

## 7. Frontend Preflight Validation

Implemented controls:
- Main file uploads are checked in the browser before upload URL generation.
- Inventory snapshot files are also preflight-validated.
- Forecast start is blocked locally when target values are invalid or missing.
- Local model runs are blocked locally if the file exceeds local series constraints.
- Upload and forecast-start errors are presented in a structured modal with a Help Center button.

Key files:
- `inventory-dashboard/components/data-input-page/use-data-input-controller.ts`
- `inventory-dashboard/components/data-input-page/data-input-page.tsx`

Practical effect:
- Many bad uploads are stopped before unnecessary S3 writes or AppSync calls happen.

## 8. Quarantine-Style Upload Flow

Implemented controls:
- Raw uploads are first written to a quarantine prefix:
  - `tenant-raw/<tenantId>/quarantine/uploads/...`
- Before forecasting starts, the backend promotes tenant-owned uploads into:
  - `tenant-raw/<tenantId>/accepted/...`
- Forecast start rejects raw keys that are not under the current tenant prefix.

Key files:
- `inventory-dashboard/lib/upload-guardrails.ts`
- `inventory-dashboard/app/api/upload-url/route.ts`
- `inventory-dashboard/app/api/forecast/start/route.ts`

Practical effect:
- Upload acceptance is a two-step process.
- This is not antivirus scanning, but it gives a clean control point between upload and processing.

## 9. Rate Limiting

Implemented controls:

Window: `15 minutes`

### Upload URL issuance
- Launch: `8`
- Professional: `16`
- Enterprise: `30`

### Forecast start
- Launch: `4`
- Professional: `8`
- Enterprise: `16`

### Manual connector sync
- Launch: `4`
- Professional: `8`
- Enterprise: `16`

Key files:
- `inventory-dashboard/lib/upload-guardrails.ts`
- `inventory-dashboard/lib/tenant-rate-limit.ts`
- `inventory-dashboard/app/api/upload-url/route.ts`
- `inventory-dashboard/app/api/forecast/start/route.ts`
- `inventory-dashboard/app/api/data-sources/[sourceId]/sync/route.ts`

Practical effect:
- Trial users and abusive clients cannot repeatedly hammer upload/start/sync flows without being throttled.

## 10. Connector Import Guardrails

Implemented controls:
- Provider-based imports are normalized into a canonical forecast dataset before use.
- The same plan-based row/series/history restrictions are enforced on connector-imported data as on CSV uploads.
- Connector sync actions are rate-limited.
- Provider credential validation is performed before extraction.
- Failed sync attempts return structured user-facing errors.

Key files:
- `inventory-dashboard/lib/data-source-sync.ts`
- `inventory-dashboard/lib/data-source-extraction.ts`
- `inventory-dashboard/app/api/data-sources/[sourceId]/sync/route.ts`

Practical effect:
- Connector imports cannot silently bypass the CSV safety envelope.

## 11. Forecast Execution Guardrails

Implemented controls:
- Backend forecast start revalidates CSV scope even if the caller bypasses the frontend.
- Target column must exist.
- Target values must be finite and usable.
- Local mode is restricted to at most `100` SKU-location series per run.
- Requested models and modes are normalized to the allowed set for the tenant’s plan.
- Forecast horizon is normalized and capped to valid bounds.

Key files:
- `forecasting-core/src/orchestrator/lib/handlers.js`

Practical effect:
- The orchestration layer does not trust the browser. It re-enforces data and plan constraints before queueing work.

## 12. Structured Error Payloads

Implemented controls:
- Backend restriction failures now return structured payloads with:
  - `code`
  - `error`
  - optional `details`
  - optional `retryAfterSeconds`
  - `helpCenterHref`
- Frontend converts these into clear user-facing modal messages.

Key files:
- `inventory-dashboard/lib/upload-guardrails.ts`
- `inventory-dashboard/app/api/upload-url/route.ts`
- `inventory-dashboard/app/api/forecast/start/route.ts`
- `inventory-dashboard/app/api/data-sources/[sourceId]/sync/route.ts`
- `inventory-dashboard/components/data-input-page/use-data-input-controller.ts`
- `inventory-dashboard/components/data-input-page/data-input-page.tsx`

Practical effect:
- Restrictions are explainable to users instead of failing as opaque 400/409/502 responses.

## 13. Audit Trail For Sensitive Data-Input Actions

Implemented controls:
- Blocked upload attempts are written to tenant audit history.
- Rate-limited upload, forecast start, and source sync actions are audited.
- Manual connector sync success/failure is audited.

Key files:
- `inventory-dashboard/lib/data-source-audit.ts`
- `inventory-dashboard/app/api/upload-url/route.ts`
- `inventory-dashboard/app/api/forecast/start/route.ts`
- `inventory-dashboard/app/api/data-sources/[sourceId]/sync/route.ts`

Practical effect:
- Early customers can be manually reviewed using app-level audit history without adding a separate monitoring system immediately.

## 14. Inventory Snapshot Separation

Implemented controls:
- Inventory on-hand can be uploaded separately as a dedicated snapshot.
- Inventory can also be inferred from a main sales CSV if an `on_hand` column is present.
- Inventory snapshots are not forced into the forecasting history model itself.

Key files:
- `inventory-dashboard/components/data-input-page/inventory-upload-section.tsx`
- `inventory-dashboard/components/data-input-page/use-data-input-controller.ts`
- `inventory-dashboard/lib/inventory-snapshot.ts`

Practical effect:
- Replenishment uses current stock inputs more safely and avoids conflating time-series sales history with point-in-time stock state.

## 15. Copilot Safety And Quality Guardrails

Implemented controls:
- Copilot uses page-aware context and structured responses instead of a purely static prompt path.
- App-specific knowledge is maintained in a curated knowledge base.
- Assistant responses expose evidence, warnings, used tools, and confidence.
- Offline and staging eval packs exist for regression checking of Copilot behavior.
- Assistant usage has monthly quota and per-minute / per-hour rate limiting.

Key files:
- `forecasting-core/src/orchestrator/lib/handlers.js`
- `forecasting-core/src/orchestrator/lib/assistant-kb.js`
- `forecasting-core/src/orchestrator/copilot-kb/*`
- `forecasting-core/src/orchestrator/evals/README.md`
- `forecasting-core/src/orchestrator/evals/assistant-evals.json`
- `forecasting-core/src/orchestrator/evals/assistant-evals.staging.json`

Practical effect:
- Copilot is less likely to give unsupported app instructions and can be regression-tested before release.

## 16. What We Deliberately Do Not Yet Have

Not currently implemented:
- Full antivirus / malware scanning of quarantine uploads
- S3 event-driven security scanning pipeline
- WAF-level bot filtering
- Deep DLP or PII classification
- Cross-tenant anomaly detection

Current position:
- For first launch with CSV-only ingestion, the implemented controls are considered a reasonable starting safety posture.
- Classic antivirus scanning is not currently required if the app remains CSV-only and uploaded content is never executed.
- Manual review of suspicious tenants or rejected uploads is an acceptable early-stage operational tradeoff.

## 17. Recommended Next Steps

Highest-value next additions after launch:
1. Escape spreadsheet formula-like cells on any CSV/XLSX export path.
2. Add simple admin-visible metrics for rejected uploads and rate-limit hits.
3. Add optional S3 quarantine scanning only if file types broaden beyond CSV/JSON or trial-user abuse rises materially.
4. Add alerting if blocked uploads spike for a tenant.

## 18. Summary

The app now enforces:
- authenticated, tenant-scoped access
- server-side subscription checks
- role restrictions
- CSV-only upload safety checks
- plan-based data size and history limits
- quarantine-to-accepted upload promotion
- rate limiting on ingestion actions
- backend revalidation before forecasting
- connector imports constrained to the same safety envelope
- structured user-facing errors and audit trails
- Copilot grounding and eval-based regression checks

This is a meaningful hardening layer for initial launch, especially while the product remains narrowly scoped to CSV and normalized connector data.
