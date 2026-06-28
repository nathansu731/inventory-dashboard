# Data Source Architecture

This document describes the current source-ingestion architecture used by ARK Forecasting across the dashboard (`inventory-dashboard`) and orchestration layer (`forecasting-core`).

## Purpose

The data-source layer exists to get forecast-compatible demand and inventory data into the app in a controlled, tenant-scoped way.

The product currently supports two main ingestion patterns:
- direct CSV upload from `/data-input`
- connected-source extraction from Shopify, QuickBooks, BigCommerce, and Amazon

Both paths are normalized toward the same canonical forecasting shape before forecast execution.

## Architectural Summary

At a high level:
1. A tenant admin chooses either file upload or a connected provider from `/data-input`.
2. Connected providers store credentials and configuration server-side.
3. A source sync extracts provider data into a canonical normalized CSV plus summary metadata.
4. The normalized file is stored in raw S3 under the tenant’s prefix.
5. Forecast runs consume either:
   - a tenant-uploaded CSV, or
   - the latest normalized connector import
6. Forecast orchestration produces run artifacts in the artifact bucket.
7. Pages such as Dashboard, KPIs, Forecast Navigator, Replenishments, and Reports read those run artifacts through API routes.

## Current Input Modes

### 1. Main sales-history upload

Handled in:
- `components/data-input-page/data-input-page.tsx`
- `components/data-input-page/use-data-input-controller.ts`
- `app/api/upload-url/route.ts`
- `app/api/forecast/start/route.ts`

This path:
- accepts a CSV file
- validates structure and scope
- uploads to a tenant-scoped quarantine prefix in raw S3
- promotes the file to an accepted prefix before forecast execution

Optional fields such as `on_hand`, `price`, `holiday`, `promotion`, and open-status can be mapped from the uploaded file.

### 2. Separate inventory snapshot upload

Handled in:
- `components/data-input-page/inventory-upload-section.tsx`
- `components/data-input-page/use-data-input-controller.ts`
- `app/api/inventory-snapshot/route.ts`
- `lib/inventory-snapshot.ts`

This path stores current stock-on-hand separately from sales history. It is used mainly by replenishment and stock-risk calculations.

### 3. Connected sources

Handled in:
- `components/data-input-page/data-source-selection.tsx`
- `components/data-input-page/data-configuration.tsx`
- `app/api/data-sources/*`
- `lib/data-source-sync.ts`
- `lib/data-source-extraction.ts`

Supported providers:
- Shopify
- QuickBooks
- BigCommerce
- Amazon SP-API

These sources are configured per tenant and can be manually or periodically synced.

## Connector Data Model

Primary source fields are defined in:
- `lib/data-sources.ts`

Important fields:
- `id`
- `provider`
- `accountName`
- `accountId`
- `state`
- `availableTables`
- `selectedTables`
- `syncMode`
- `lastImportAt`
- `nextImportAt`
- `retryCount`
- `lastError`
- `sourceConfig`
- `diagnostics`
- `latestImport`
- `runs`

Tenant-level supporting structures include:
- `dataSources`
- `dataSourceAdapters`
- `dataSourceSecrets`
- `dataSourceAudit`

The app also supports a dedicated table path for data sources via:
- `lib/data-sources-repo.ts`

## Provider Configuration Model

Provider setup is not just “connect account”. Each source can also carry an extraction recipe.

Relevant files:
- `lib/provider-source-config.ts`
- `components/data-input-page/connector-import-setup-section.tsx`
- `components/data-input-page/data-configuration.tsx`

Current source configuration includes fields such as:
- selected sales entity
- selected catalog entity
- selected inventory entity
- date range
- order date field
- cancelled-order handling
- SKU strategy and mapping choices

This lets the app shape provider data into the same forecasting schema used by CSV uploads.

## Canonical Forecast Shape

Connected-source extraction normalizes into a row model like:

```csv
date,sku,store,sales,price,on_hand
```

Defined in:
- `lib/data-source-extraction.ts`

Canonical row fields:
- `date`
- `sku`
- `store`
- `sales`
- optional `price`
- optional `on_hand`

This is the same shape that downstream forecasting expects, even when the original provider schema is more complex.

## Provider Extraction Behavior

The extraction layer currently implements:

### Shopify
- orders and line items for demand
- products / variants / inventory levels for stock data where available

### QuickBooks
- sales receipts or invoices for demand
- items for SKU metadata and inventory quantities where available

### BigCommerce
- orders plus order products for demand
- variants / inventory levels for stock data

### Amazon
- orders and order items
- inventory summaries where available

All providers are normalized through:
- `runProviderExtraction()`

in:
- `lib/data-source-extraction.ts`

## Connector Sync Flow

Manual sync endpoint:
- `app/api/data-sources/[sourceId]/sync/route.ts`

Core sync engine:
- `lib/data-source-sync.ts`

Flow:
1. Validate current user is an admin.
2. Acquire a source sync lock.
3. Validate provider credentials.
4. Extract provider data.
5. Enforce plan-based ingestion limits.
6. Persist the normalized import artifact in raw S3.
7. Update source metadata and diagnostics.
8. Emit audit events and connector notifications.
9. Release the lock.

Scheduled sync support also exists through:
- `app/api/data-sources/sync-due/route.ts`
- `app/api/internal/data-sources/run-due/route.ts`

## Inventory Snapshot Integration

Inventory can come from three places:
- a dedicated inventory CSV
- an `on_hand` column in the main uploaded CSV
- connected-source extraction

Stored through:
- `lib/inventory-snapshot.ts`

Inventory snapshots are saved separately from forecast demand history so replenishment can use a current operational stock position without rerunning or mutating the historical sales dataset.

## Forecast Start Handoff

Forecast start is initiated from:
- `app/api/forecast/start/route.ts`

This route can start a run from:
- an accepted upload in raw S3
- the latest connector import artifact

It forwards the forecast input to AppSync / orchestration, including:
- model
- mode
- seasonality
- date format
- field mappings
- forecast horizon
- future assumptions

## Orchestration Layer

The forecast backend reads and manages:
- tenant settings
- run records
- data snapshots
- artifact retrieval

Key files:
- `forecasting-core/src/orchestrator/lib/shared.js`
- `forecasting-core/src/orchestrator/lib/handlers.js`

Important backend responsibilities:
- validate forecast-start input
- normalize plan/model/mode choices
- queue local or direct forecast execution
- persist run metadata
- expose artifact retrieval helpers for pages

## Produced Artifacts

Run artifacts are written under:
- `tenant-artifacts/<tenantId>/runs/<runId>/...`

Common files:
- `daily_forecasts.json`
- `monthly_forecasts.json`
- `monthly_totals.json`
- `metadata.json`
- `report_summary.json`
- `replenishment_signals.json`
- `sku_forecast_values.json`

These are read back through AppSync result-file accessors and surfaced to the frontend by Next API routes.

## Frontend Consumption Pattern

Frontend pages generally do not talk directly to S3 or DynamoDB. Instead they use:
- Next API routes in `app/api/*`
- AppSync-backed result fetches
- local transformation helpers

Examples:
- Dashboard: daily forecasts, monthly totals, report summary, replenishment signals, notifications
- KPIs: report summary, monthly totals, per-series validation metrics, recent runs
- Replenishments: replenishment signals, metadata, inventory coverage
- Reports: forecast run list plus parsed run summaries
- Forecast Navigator / Editor: `sku_forecast_values.json` plus run selection

## Observability And Operations

The source layer currently supports:
- per-source diagnostics
- run history
- activity audit trail
- connector notifications
- due-sync scheduling
- sync locks

Relevant files:
- `lib/data-source-audit.ts`
- `lib/connector-notifications.ts`
- `lib/data-source-worker.ts`
- `components/data-input-page/source-ops-health-section.tsx`
- `components/data-input-page/recent-source-activity-section.tsx`

## Security And Guardrails

The data-source layer now includes:
- tenant-scoped upload keys
- quarantine-to-accepted upload promotion
- plan-based row / series / history limits
- connector sync rate limits
- upload and forecast-start rate limits
- audit logging for blocked ingestion attempts
- structured restriction errors returned to the UI

See:
- `docs/security-and-guardrails.md`

## Current Boundary

The connector system is now materially beyond “connection only”. It performs real extraction and normalization. However:
- provider extraction depth still varies by provider
- this is not yet a general ETL framework
- the canonical schema is intentionally narrow and forecasting-focused

That is a good constraint for the current product. The architecture is optimized for getting demand and replenishment-ready data into forecasting, not for becoming a full operational data warehouse.
