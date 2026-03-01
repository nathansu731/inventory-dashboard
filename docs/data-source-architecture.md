# Data Source Connectivity Architecture (Phases 1-4)

## Purpose
This document describes the current multi-tenant connector architecture implemented for ARK Forecasting, including what was delivered in Phases 1-4, the main files touched, security controls, runbook steps, and recommended next improvements.

## Scope
The architecture currently covers:
- Data source onboarding and configuration in `/data-input`
- Shopify OAuth connection as first connector
- Manual and scheduled sync flows
- Sync locking/retry/audit/notifications
- Scale-ready storage via dedicated `data_sources` table
- Backfill and scheduler plumbing for production rollout

## High-Level Architecture
1. Admin connects a provider from `/data-input`.
2. OAuth callback validates request and stores source metadata + encrypted token.
3. Source configuration is written to tenant record and dedicated data-sources table.
4. Sync can be triggered manually or by worker due-run.
5. Sync updates source state, retry counters, run history, and next schedule.
6. Audit events and user-facing notifications are emitted.
7. Health/activity panels surface connector status.

## Data Model
Primary source entity fields (logical):
- `id`
- `provider`
- `accountName`, `accountId`
- `state` (`connected`, `error`, `not_connected`)
- `selectedTables`
- `syncMode` (`manual`, `every-6h`, `daily`, `weekly`)
- `syncStartDate`
- `lastImportAt`, `nextImportAt`
- `retryCount`, `lastError`
- `runs[]`
- `createdAt`, `updatedAt`

Supporting tenant-level structures:
- `dataSources` (compatibility/primary tenant blob)
- `dataSourceSecrets` (encrypted connector credentials)
- `dataSourceAudit` (activity feed)
- `syncLock` and `syncSourceLocks` (concurrency controls)

Dedicated scale table:
- DynamoDB `data_sources` table
- GSI `byDueAt` (`GSI1PK`, `GSI1SK`) for due-worker query path
- GSI `byProvider` (`GSI2PK`, `GSI2SK`) for provider-level filtering/operations

## Phase 1: Foundation
### Delivered
- Added connector configuration UX in `/data-input` using existing data widgets.
- Added source CRUD APIs and source normalization.
- Added role-aware behavior (Admin can manage sources; Managers restricted).

### Main files
- `components/data-input-page/data-input-page.tsx`
- `components/data-input-page/data-source-selection.tsx`
- `components/data-input-page/data-configuration.tsx`
- `app/api/data-sources/route.ts`
- `app/api/data-sources/[sourceId]/route.ts`
- `lib/data-sources.ts`

## Phase 2: Connector MVP (Shopify)
### Delivered
- Implemented Shopify OAuth start/callback API flow.
- Added secure token handling: encrypted at rest in tenant secret map.
- Added source reconnect/update semantics.
- Added source-level sync trigger endpoint.

### Main files
- `app/api/data-sources/shopify/start/route.ts`
- `app/api/data-sources/shopify/callback/route.ts`
- `app/api/data-sources/[sourceId]/sync/route.ts`
- `lib/data-source-secrets.ts`
- `lib/data-source-sync.ts`

## Phase 3: Reliability + Observability
### Delivered
- Added sync engine abstraction with:
  - provider-specific execution path
  - retry scheduling
  - run history updates
- Added lock strategy:
  - tenant lock for worker scans
  - per-source lock for individual sync execution
- Added connector notifications on sync outcomes.
- Added connector audit trail events.
- Added health endpoint and UI visibility.

### Main files
- `lib/data-source-sync.ts`
- `lib/data-source-worker.ts`
- `lib/connector-notifications.ts`
- `lib/data-source-audit.ts`
- `app/api/data-sources/sync-due/route.ts`
- `app/api/data-sources/health/route.ts`
- `components/data-input-page/data-input-page.tsx`

## Phase 4: Scale + Production Operations
### Delivered
- Added dedicated table support and dual-write behavior.
- Added read fallback strategy (dedicated table first, tenant blob fallback).
- Added due-index worker path using `byDueAt` GSI.
- Added internal backfill endpoint for migration/cutover.
- Added internal worker endpoint for due-run execution.
- Added optional EventBridge scheduler infra in Terraform.

### Main files (app)
- `lib/data-sources-repo.ts`
- `app/api/internal/data-sources/run-due/route.ts`
- `app/api/internal/data-sources/backfill/route.ts`
- `app/api/data-sources/route.ts`
- `app/api/data-sources/[sourceId]/route.ts`
- `app/api/data-sources/[sourceId]/sync/route.ts`
- `app/api/data-sources/sync-due/route.ts`
- `app/api/data-sources/shopify/callback/route.ts`

### Main files (terraform)
- `forecasting-core/terraform/dynamodb.tf`
- `forecasting-core/terraform/scheduler.tf`
- `forecasting-core/terraform/variables.tf`
- `forecasting-core/terraform/outputs.tf`
- `forecasting-core/terraform/terraform.tfvars`
- `forecasting-core/terraform/main.tf`

## Security Measures Implemented
- OAuth callback protections:
  - signed state + state cookie validation
  - Shopify callback HMAC validation
- Credentials protection:
  - AES-256-GCM encryption for stored provider access token
  - server-side only token handling
- Access control:
  - role checks for source-management APIs
  - manager restrictions where applicable
- Internal operations protection:
  - worker endpoints require `x-worker-token` header
  - scheduler injects token via EventBridge connection
- Concurrency protections:
  - lock-based source sync gating prevents duplicate simultaneous runs
- Operational isolation:
  - notification writes are best-effort and do not block sync completion

## Runtime Configuration
### Application env vars (inventory-dashboard)
- `AWS_REGION`
- `TENANTS_TABLE`
- `DATA_SOURCES_TABLE`
- `WORKER_CRON_TOKEN`
- `DATA_SOURCE_ENCRYPTION_KEY`
- `DATA_SOURCE_ENCRYPTION_KEY_JSON` (optional alternative)
- `SHOPIFY_CLIENT_ID`
- `SHOPIFY_CLIENT_SECRET`
- `SHOPIFY_SCOPES` (optional)
- `SHOPIFY_REDIRECT_URI`

Also required for broader existing app features:
- Cognito variables (`COGNITO_*`, `NEXT_PUBLIC_COGNITO_*`)
- `NOTIFICATIONS_TABLE`
- `SAVED_REPORTS_TABLE`
- `S3_RAW_BUCKET`
- `APPSYNC_API_URL`

### Terraform variables (forecasting-core)
- `data_source_worker_run_due_url`
- `data_source_worker_cron_expression`
- `data_source_worker_cron_token`

## Production Rollout Runbook
1. Deploy Terraform changes (including `data_sources` + optional scheduler).
2. Deploy dashboard with required environment variables.
3. Execute one-time backfill:
   - `POST /api/internal/data-sources/backfill`
   - Header `x-worker-token: <WORKER_CRON_TOKEN>`
4. Validate worker endpoint:
   - `POST /api/internal/data-sources/run-due`
   - Header `x-worker-token: <WORKER_CRON_TOKEN>`
5. Verify UI flows:
   - Connect source
   - Configure tables/sync mode
   - Trigger manual sync
   - Confirm health/activity status
6. Validate audit + notification entries are produced.

## Known Constraints
- Dedicated table migration is dual-write + fallback, not hard cutover yet.
- Current provider implementation is Shopify-first; others are placeholders.
- Encryption key is env-based in current implementation. Secrets Manager/KMS hard integration can be added as follow-up.

## Recommended Next Improvements
1. Queue-based sync engine
- Move due-sync execution from API route to SQS/Lambda worker model for better horizontal scale and failure isolation.

2. Secrets + key management hardening
- Source encryption key from AWS Secrets Manager with KMS CMK and key rotation policy.
- Add token re-encryption migration job for key rotation.

3. Connector depth
- Implement real Shopify extractors for selected entities (orders/products/inventory) with incremental cursors.
- Add providers via pluggable adapter interface (Amazon, QuickBooks, BigCommerce).

4. Observability
- Add structured logging with correlation IDs.
- Publish metrics (sync lag, success/failure rates, retry volume, lock contention).
- Alarm on stale due items and repeated failure thresholds.

5. Cutover hardening
- Add reconciliation endpoint/report between tenant blob and dedicated table.
- Add feature flag to switch reads to dedicated table only once reconciliation is clean.

6. Rate limiting and tenant fairness
- Add per-tenant and per-provider concurrency budgets.
- Add backpressure policy for burst traffic.

## Current Status
Phases 1-4 are implemented for MVP-level production readiness of connector management and scheduled sync orchestration, with clear next steps for deeper ingestion, stronger secret governance, and large-scale workload handling.
