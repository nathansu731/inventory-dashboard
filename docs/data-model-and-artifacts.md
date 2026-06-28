# Data Model And Artifacts

This document describes the main data shapes used by the app and how those shapes flow from ingestion through forecast runs into frontend pages.

## Core Data Layers

The application works across four major data layers:

1. raw tenant input data
2. normalized forecast-ready datasets
3. forecast run records and snapshots
4. generated run artifacts

## 1. Raw Tenant Input Data

Raw input data is stored in the raw bucket under tenant-scoped prefixes.

Examples:
- uploaded sales CSV
- connected-source normalized imports
- inventory snapshots

Common raw prefixes:
- `tenant-raw/<tenantId>/quarantine/uploads/...`
- `tenant-raw/<tenantId>/accepted/uploads/...`
- `tenant-raw/<tenantId>/connector-imports/...`
- `tenant-raw/<tenantId>/inventory/...`

Relevant files:
- `app/api/upload-url/route.ts`
- `app/api/forecast/start/route.ts`
- `lib/data-source-extraction.ts`
- `lib/inventory-snapshot.ts`

## 2. Inventory Snapshot Model

Stored separately from sales history.

Defined in:
- `lib/inventory-snapshot.ts`

Row shape:

```ts
{
  sku: string
  store: string
  onHand: number
  asOfDate?: string | null
}
```

Metadata fields:
- `inventorySnapshotKey`
- `inventorySnapshotUploadedAt`
- `inventorySnapshotRowCount`
- `inventorySnapshotAsOfDate`
- `inventorySnapshotSourceType`

Supported sources:
- `sales_csv`
- `inventory_csv`
- `manual`
- `source_import`

Purpose:
- replenishment uses a current stock position
- inventory is not mixed directly into demand history unless explicitly inferred

## 3. Connected-Source Normalized Dataset

Defined in:
- `lib/data-source-extraction.ts`

Canonical normalized row:

```ts
{
  date: string
  sku: string
  store: string
  sales: number
  price?: number | null
  on_hand?: number | null
}
```

This is the bridging format between provider-native data and forecast execution.

Persisted import metadata:
- `s3Bucket`
- `s3Key`
- `summaryKey`
- `rowCount`
- `inventoryRowCount`
- `extractedAt`
- `sourceRunId`
- `columnNames`
- `dateStart`
- `dateEnd`
- `uniqueSkus`
- `uniqueSeries`

Purpose:
- gives connected sources the same operational interface as uploaded CSVs

## 4. Tenant Settings Model

Tenant-level forecast defaults are read and written through:
- `forecasting-core/src/orchestrator/lib/shared.js`
- `app/api/tenant-settings/route.ts`

Important defaults:
- model
- mode
- seasonality
- date format
- SKU column
- store column
- target column
- `on_hand` column
- price / holiday / promotion / open-status columns
- forecast horizon

Purpose:
- reduce setup friction for repeated uploads and runs

## 5. Forecast Run Record

Run metadata is stored in the forecast runs table.

Main fields:
- `tenantId`
- `runId`
- `snapshotId`
- `parentRunId`
- `isScenario`
- `scenarioLabel`
- `editedCellCount`
- `status`
- `executionMode`
- `seriesCount`
- `batchCount`
- `completedBatchCount`
- `failedBatchCount`
- `s3OutputPrefix`
- `createdAt`
- `updatedAt`

Defined and populated in:
- `forecasting-core/src/orchestrator/lib/handlers.js`

Purpose:
- represent one forecast execution, including scenario child runs

## 6. Data Snapshot Record

Each run points to a snapshot record.

Snapshot fields:
- `tenantId`
- `snapshotId`
- `s3Bucket`
- `s3Key`
- `originalFilename`
- `createdAt`
- `status`

Purpose:
- preserve the input dataset reference used for the run

## 7. Main Generated Artifact Set

Artifacts live under:
- `tenant-artifacts/<tenantId>/runs/<runId>/`

Current artifact set:
- `daily_forecasts.json`
- `monthly_forecasts.json`
- `monthly_totals.json`
- `metadata.json`
- `report_summary.json`
- `replenishment_signals.json`
- `sku_forecast_values.json`

Defined in result-file access paths through:
- `forecasting-core/src/orchestrator/lib/shared.js`
- `forecasting-core/src/orchestrator/lib/handlers.js`

## 8. Artifact Meanings

### `daily_forecasts.json`

Purpose:
- short-horizon forecast rows by date, SKU, and store

Used by:
- dashboard
- replenishment fallback logic
- short-horizon forecast views

Typical row:

```json
{
  "sku": "SKU-1",
  "store": "1",
  "date": "2015-08-01",
  "forecast": 5240.79,
  "lower80": 2594.03,
  "upper80": 7887.54,
  "lower95": 1193,
  "upper95": 9288.57
}
```

### `monthly_forecasts.json`

Purpose:
- month-keyed aggregates such as demand, forecast baseline, adjustments, variance, revenue, budget

Used by:
- forecasting summary
- longer-horizon aggregate views

### `monthly_totals.json`

Purpose:
- headline KPI tiles such as revenue, growth, stockout risk count, and forecast accuracy

Used by:
- dashboard
- KPIs

### `metadata.json`

Purpose:
- SKU/store-level descriptive metadata

Typical fields:
- SKU description
- forecast method
- ABC class
- approval state

Used by:
- dashboard tables
- replenishment labeling
- navigator/editor label display

### `report_summary.json`

Purpose:
- the densest run-summary artifact

Typical content:
- total SKUs / series / rows
- date range
- executed model and mode
- validation metrics
- per-series validation
- future assumptions impact
- target cleanup diagnostics

Used by:
- KPIs
- reports
- dashboard
- Copilot

### `replenishment_signals.json`

Purpose:
- convert forecast demand and inventory into replenishment-oriented risk rows

Typical fields:
- average daily demand
- horizon demand
- on hand
- on-hand source
- days of cover
- reorder by date
- predicted stockout date
- recommended reorder quantity
- risk
- confidence

Used by:
- replenishments
- dashboard exceptions
- KPI risk context

### `sku_forecast_values.json`

Purpose:
- the most granular time-series artifact for selected series inspection

Contains:
- periods
- demand
- forecast baseline
- forecast adjustments
- intervals
- original values

Used by:
- forecast navigator
- forecast editor
- selected-series Copilot explanations

## 9. Frontend Data Access Pattern

Frontend pages generally fetch through Next API routes rather than reading artifacts directly.

Examples:
- `/api/get-daily-forecasts`
- `/api/get-monthly-totals`
- `/api/get-report-summary`
- `/api/get-sku-forecast-values`
- `/api/get-replenishment-signals`
- `/api/get-skus-metadata`
- `/api/list-forecast-runs`

This keeps:
- auth centralized
- artifact lookup tenant-scoped
- frontend code simpler

## 10. Merged View Fallbacks

The app includes helpers that can synthesize merged views from `sku_forecast_values.json` when dedicated artifact shapes are missing or need fallback assembly.

Defined in:
- `lib/merged-forecast-views.ts`

These helpers can derive:
- merged daily forecasts
- merged monthly forecasts
- merged report summary
- merged monthly totals

Purpose:
- make downstream UI more resilient
- reduce dependence on a single precomputed artifact path

## 11. Notifications Model

Notifications are run- and connector-oriented.

Examples:
- forecast run queued / complete / failed
- connector sync success / failure

Used by:
- `/notifications`
- dashboard right panel

The page currently focuses on forecast and connector activity rather than a broader product event stream.

## 12. Saved Report Model

Saved reports are stored separately from runs.

Purpose:
- preserve a chosen report definition and snapshot criteria
- allow replay or review of multi-run reporting selections

Frontend area:
- `components/saved-reports/*`
- `lib/saved-reports.ts`

## 13. Approval / Scenario Model

The app supports:
- forecast approvals at series level
- edited scenario runs as child runs

These are separate from the original base run rather than destructive overwrites.

Purpose:
- preserve traceability between baseline and adjusted outputs

## 14. How Pages Use The Data

### Dashboard
- latest daily forecast horizon
- headline monthly totals
- report summary
- replenishment signals
- notifications

### Forecasting Summary
- aggregate forecast and validation views
- report summary
- monthly forecast structures

### Forecast Navigator
- `sku_forecast_values.json`
- run comparison context

### Forecast Editor
- selected-series values and adjustments
- scenario child run creation

### KPIs
- validation metrics from report summary
- recent run summaries
- replenishment risk context

### Replenishments
- replenishment signals
- inventory coverage metadata
- metadata labels

### Reports
- run list
- parsed run summary metrics
- scenario and exception summaries

## 15. Product Data Boundary

The product currently uses data primarily for:
- forecasting demand
- evaluating forecast quality
- identifying replenishment risk
- comparing runs and scenario changes
- surfacing planning-friendly summaries

It is not currently designed as:
- a general warehouse
- a full accounting system
- a procurement system
- a full operational inventory source of truth

That boundary is important when extending the model or documenting new features.
