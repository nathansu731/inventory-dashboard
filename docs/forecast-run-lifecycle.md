# Forecast Run Lifecycle

This document describes the current end-to-end lifecycle of a forecast run across ingestion, orchestration, artifact generation, and frontend consumption.

## Purpose

The forecast lifecycle is the main operating flow of the product:
- data enters the platform
- a tenant-scoped run is created
- the orchestration layer generates artifacts
- pages consume those artifacts for analysis, editing, replenishment, reporting, and Copilot guidance

## Lifecycle Summary

At a high level:
1. The tenant uploads a CSV or syncs a connected source.
2. The app validates the input and stores it in raw S3.
3. The forecast start route creates a snapshot and forecast run.
4. The orchestration layer executes the selected model and mode.
5. Run artifacts are written to the artifact bucket.
6. Notifications and summaries are generated.
7. Frontend pages read the artifacts through API routes.
8. Scenario edits can create child runs derived from the base run.

## 1. Data Intake

The product currently supports three intake shapes:
- uploaded sales history CSV
- connected-source normalized import
- inventory snapshot

Relevant frontend and API entry points:
- `components/data-input-page/*`
- `app/api/upload-url/route.ts`
- `app/api/forecast/start/route.ts`
- `app/api/inventory-snapshot/route.ts`
- `app/api/data-sources/*`

The forecast lifecycle always starts from a forecast-compatible demand dataset. Inventory snapshots are parallel supporting inputs rather than the main forecast history.

## 2. Validation And Guardrails

Before a run is accepted, the app applies both frontend and backend checks.

Current controls include:
- CSV-only path
- row, column, and cell-size limits
- history-window limits
- per-series row limits
- plan-based limits
- tenant-scoped auth
- rate limits
- audit logging on blocked attempts

The backend remains the source of truth for these checks even if the frontend has already preflighted the file.

## 3. Snapshot And Run Creation

Forecast start is initiated through:
- `app/api/forecast/start/route.ts`

The route resolves:
- accepted upload path, or
- latest connector import path

It then forwards run creation into the orchestration layer, including:
- tenant-scoped source location
- forecast settings
- mapped data columns
- run configuration such as model, mode, seasonality, and horizon

The orchestration layer creates:
- a data snapshot record
- a forecast run record

Important run concepts:
- `runId`
- `snapshotId`
- `parentRunId`
- `isScenario`
- `scenarioLabel`
- `status`

## 4. Orchestration Execution

Main backend logic is in:
- `forecasting-core/src/orchestrator/lib/handlers.js`
- `forecasting-core/src/orchestrator/lib/shared.js`

The orchestrator:
- reads the raw input file
- validates the selected target column
- enforces run-level scope limits
- prepares configuration for the R forecasting process
- executes the selected model and mode
- persists status and output paths

The backend currently supports both base runs and scenario-derived runs.

## 5. Artifact Generation

Each completed run writes a standard artifact bundle under the tenant run prefix.

Current artifacts:
- `daily_forecasts.json`
- `monthly_forecasts.json`
- `monthly_totals.json`
- `metadata.json`
- `report_summary.json`
- `replenishment_signals.json`
- `sku_forecast_values.json`

These artifacts are the main contract between the forecasting engine and the dashboard application.

## 6. Post-Run Signals

After execution, the app can generate:
- run notifications
- connector sync notifications
- run summaries for dashboard and KPI surfaces
- replenishment signals derived from forecast demand plus inventory position

Notifications surface run state and key summary facts, while page APIs read the fuller artifact set.

## 7. Frontend Consumption

The frontend generally consumes artifacts through route-level APIs rather than reading storage directly.

Typical consumption pattern:
1. page loads current tenant and selected run context
2. page-specific API reads the relevant artifact subset
3. helper libraries transform artifacts into page view models
4. components render tables, cards, charts, modals, and worklists

Examples:
- Dashboard combines forecast, KPI, summary, and replenishment views
- Forecast Navigator uses per-series forecast values
- Forecast Editor uses base-vs-edited series views
- KPIs combine validation metrics, summaries, and recent-run context
- Replenishments merge inventory snapshots with forecast demand
- Reports summarize outputs into export-friendly views

## 8. Scenario And Editing Lifecycle

Forecast editing does not retrain the model in place.

Instead, the current product uses a scenario-oriented pattern:
- start from a base run
- apply overrides or edited values
- generate a scenario run
- compare base and edited results

Important implications:
- base run artifacts remain intact
- scenario runs are traceable through `parentRunId`
- edited outputs can be compared without destroying the original execution

## 9. Replenishment Lifecycle

Replenishment is downstream of forecasting.

It combines:
- forecast demand
- metadata
- inventory snapshot if available
- estimated inventory fallback where live stock is missing

This means replenishment can change when inventory changes, even if the forecast run itself does not.

## 10. Reporting Lifecycle

Reports are downstream views over run artifacts rather than separate forecasting executions.

The report layer:
- summarizes selected runs
- packages outputs for review and export
- preserves saved reports separately from raw run artifacts

## 11. Copilot Lifecycle

Copilot is also downstream of the run lifecycle.

It uses:
- selected run context
- selected SKU/store context where available
- run artifacts and summaries
- internal knowledge-base content

Its quality depends on the same artifact integrity and page context that drive the main product UI.

## 12. Operational Boundaries

Important current boundaries:
- the forecast lifecycle is tenant-scoped
- the run artifact bundle is the main product contract
- inventory and forecast history are intentionally separated
- connected sources are normalized into the same forecast path as CSV uploads
- scenario editing produces derived runs rather than mutating the original run

## Related Documents

- `data-source-architecture.md`
- `data-model-and-artifacts.md`
- `product-domain-and-page-map.md`
- `security-and-guardrails.md`
