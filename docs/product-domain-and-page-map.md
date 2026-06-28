# Product Domain And Page Map

This document describes the main domain areas of ARK Forecasting and how they map to the current frontend product surface.

## Product Purpose

ARK Forecasting is a demand-forecasting and replenishment planning application for multi-SKU, multi-location retail or inventory-driven businesses.

The product currently focuses on:
- ingesting historical demand data
- generating forecast runs
- evaluating forecast quality
- supporting scenario edits and run comparison
- surfacing replenishment risk
- turning forecast outputs into dashboards, KPI views, and reports

## Main Domain Concepts

Core business objects:
- tenant
- user
- subscription / plan
- uploaded file or connected source
- inventory snapshot
- forecast run
- scenario run
- run artifacts
- replenishment signal
- notification
- saved report
- Copilot interaction

## Primary Navigation Areas

The main app navigation is defined from the current route structure and sidebar.

Primary product areas:
- `/overview`
- `/dashboard`
- `/forecasts/forecasting-summary`
- `/forecasts/forecast-navigator`
- `/forecasts/forecast-editor`
- `/kpis`
- `/kpis/kpi-navigator`
- `/reports`
- `/reports/saved-reports`
- `/replenishments`
- `/data-input`
- `/notifications`
- `/users`
- `/account-and-subscription`
- `/profile`
- `/help-center`

## Page Responsibilities

### 1. Data Input

Route:
- `/data-input`

Main purpose:
- bring forecast-compatible data into the system
- configure forecasting defaults
- connect and manage external sources

Main sections:
- data source configuration
- file upload
- inventory snapshot upload
- field mapping
- advanced settings
- connector import setup
- source health / recent source activity
- run forecast actions
- onboarding Copilot

Main frontend area:
- `components/data-input-page/*`

### 2. Dashboard

Route:
- `/dashboard`

Main purpose:
- provide the high-level operational view of the latest run

Main sections:
- top metric tiles
- demand forecast overview chart
- demand / item table
- right-side alerts and exception panels
- metric details modal
- item detail modal

Main frontend area:
- `components/dashboard/*`

Primary data used:
- `daily_forecasts.json`
- `monthly_totals.json`
- `report_summary.json`
- `replenishment_signals.json`
- notifications

### 3. Overview

Route:
- `/overview`

Main purpose:
- provide a broader executive overview and demand snapshot

This is complementary to the dashboard and is more summary-oriented.

### 4. Forecasting Summary

Route:
- `/forecasts/forecasting-summary`

Main purpose:
- tabular summary of the generated run outputs
- validation and performance-oriented overview

Primary data:
- `monthly_forecasts.json`
- `monthly_totals.json`
- `report_summary.json`
- metadata and validation sections embedded in run summary

Main frontend area:
- `components/forecasting-summary/*`

### 5. Forecast Navigator

Route:
- `/forecasts/forecast-navigator`

Main purpose:
- inspect run outputs by item, period, and compare-run context
- understand baseline vs adjusted forecast movement

Main sections:
- run selection
- compare-run overlay
- chart
- forecast table
- detail cards

Primary data:
- `sku_forecast_values.json`
- run metadata and summary

Main frontend area:
- `components/forecast-navigator/*`

### 6. Forecast Editor

Route:
- `/forecasts/forecast-editor`

Main purpose:
- create scenario edits and overrides
- compare base vs edited values

This is the run-adjustment workflow rather than a model retraining workflow.

Main frontend area:
- `components/forecast-editor/*`

### 7. KPIs

Route:
- `/kpis`

Main purpose:
- explain forecast quality and operational risk at run level and series level

Main sections:
- KPI cards
- trend charts
- risk table / worklist
- method and ABC-class breakdowns
- recent run context

Primary data:
- `report_summary.json`
- `monthly_totals.json`
- per-series validation metrics in summary
- replenishment signals
- recent runs

Main frontend area:
- `components/kpis/*`

### 8. KPI Explorer

Route:
- `/kpis/kpi-navigator`

Main purpose:
- inspect a selected SKU/store in more depth
- move from aggregate KPI interpretation into item-level detail

Main frontend area:
- `components/kpi-navigator/*`

### 9. Replenishments

Route:
- `/replenishments`

Main purpose:
- convert forecast outputs and inventory position into replenishment actions

Main sections:
- risk summary cards
- coverage / inventory warning
- SKU worklist
- priority exceptions
- detail dialog

Primary data:
- `replenishment_signals.json`
- inventory snapshot metadata
- metadata and daily forecast fallback where needed

Main frontend area:
- `components/replenishments/replenishments-page.tsx`

### 10. Reports

Route:
- `/reports`

Main purpose:
- compare runs
- inspect run quality and scenario history
- save report definitions

Main sections:
- report KPI cards
- run comparison / run history table
- save report controls
- scenario and exception summaries

Main frontend area:
- `components/reports/*`

### 11. Saved Reports

Route:
- `/reports/saved-reports`

Main purpose:
- manage saved report definitions and report snapshots

Main frontend area:
- `components/saved-reports/*`

### 12. Notifications

Route:
- `/notifications`

Main purpose:
- surface forecast run and connector sync updates

Main frontend area:
- `components/notifications/*`

### 13. Users

Route:
- `/users`

Main purpose:
- manage tenant users, roles, invites, and seat visibility

Current role model:
- admin
- manager

Main frontend area:
- `components/users/users-page.tsx`

### 14. Account And Subscription

Route:
- `/account-and-subscription`

Main purpose:
- show plan state, trial state, billing actions, restore-access flow, and upgrade/change-plan behavior

### 15. Profile

Route:
- `/profile`

Main purpose:
- personal account management, password, MFA, access details, and tokens

### 16. Help Center

Route:
- `/help-center`

Main purpose:
- user support and guided assistance entry point

## Cross-Cutting Product Themes

There are a few themes that cut across multiple pages:

### Run-centric design
- most analytical pages are anchored around the latest run or a selected run

### Multi-SKU and multi-location support
- many tables and filters operate on SKU-location series, not just SKU

### Scenario editing
- edited runs are tracked as child/scenario runs, not as destructive overwrites

### Forecast quality interpretation
- KPI pages, reports, and Copilot all rely on validation metrics in run summaries

### Replenishment as a downstream workflow
- replenishment is not the forecasting engine itself
- it consumes forecast demand plus current inventory assumptions/snapshots

## Supporting System Areas

### API layer
- `app/api/*`

This layer translates frontend page needs into:
- AppSync queries/mutations
- raw bucket upload flows
- connector management actions
- inventory snapshot actions
- help center submission

### Copilot
- `components/copilot/forecast-copilot-provider.tsx`
- `forecasting-core/src/orchestrator/copilot-kb/*`

Copilot is page-aware and run-aware, and is intended to explain app behavior, metrics, and operational risk rather than act as a general chat assistant.

## Product Boundary

The current product is not a full ERP, WMS, or BI suite.

It is strongest when treated as:
- a forecasting workspace
- a run comparison and scenario editing surface
- a replenishment insight tool
- a planning/reporting product for inventory-driven teams

That boundary is useful to preserve while the product matures.
