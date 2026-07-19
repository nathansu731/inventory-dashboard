# Forecast Execution And Queueing

This document explains what happens after a user uploads a forecast CSV. It describes the target production architecture after the queue-cost optimization Terraform change is deployed.

## Short Version

1. The browser uploads a CSV to the tenant's raw S3 area using a pre-signed URL.
2. The dashboard asks the backend to start a forecast run.
3. The orchestrator validates the file again, creates a snapshot and run record, then selects either local or global execution.
4. A global run is one asynchronous forecast Lambda invocation.
5. A local run uses SQS to split the work by SKU-location series and process those small groups in parallel.
6. The forecast runtime writes artifacts to the tenant's S3 run prefix. Local batches are aggregated into one final artifact set.
7. Dashboard pages read the final artifacts through dashboard API routes.

The CSV is not sent directly to the ECR image from the browser. The ECR image is the Lambda runtime implementation; it reads the tenant-scoped CSV from S3 after the backend has accepted the run.

## Upload And Run Creation

### 1. Upload

From `/data-input`:

1. The browser validates the selected CSV before upload.
2. The dashboard requests a pre-signed upload URL from `app/api/upload-url/route.ts`.
3. The browser uploads directly to the tenant's raw S3 prefix, initially under the quarantine upload path.
4. The dashboard calls `app/api/forecast/start/route.ts` when the user starts forecasting.

The browser never receives direct DynamoDB or forecast-runtime credentials.

### 2. Backend validation and records

The forecast-start API calls the orchestrator's `startForecastRun` action. The orchestrator:

- verifies the tenant and accepted S3 key
- reads the CSV from S3
- repeats plan, CSV shape, target-column, history, and series-limit checks
- saves tenant forecast settings
- creates a snapshot record and a forecast-run record in DynamoDB
- sets the run to `QUEUED`, then `DISPATCHING` or `RUNNING`

The resulting artifact root is tenant and run scoped:

`tenant-artifacts/<tenantId>/runs/<runId>/`

## Choosing Local Or Global

The selected `mode` determines the execution path. The selected model still controls the forecasting method inside the R runtime.

| Mode | Purpose | Execution shape |
| --- | --- | --- |
| `global` | Run the selected global forecast strategy over the accepted dataset. | One asynchronous invocation of the main forecast Lambda. No SQS worker polling is involved. |
| `local` | Forecast individual SKU-location time series. This is the normal distributed local-model path. | One dispatch message, then one SQS message per small group of series. |

`local` does not mean a user's computer. Both modes execute in AWS Lambda using the same ECR image containing the R runtime.

### Global mode

For global mode, the orchestrator asynchronously invokes the main forecast Lambda with the run payload. That Lambda reads the CSV from S3, runs the R forecast pipeline, and writes the final artifact set directly to the run root. The R runtime uses a global model when at least three series are available; otherwise it falls back to local ARIMA and records the requested and executed modes in `report_summary.json`.

The main global runner has a reserved concurrency limit of `5`. This bounds compute spend if multiple large or problematic global runs arrive together. Excess asynchronous invocations wait in Lambda's managed asynchronous queue rather than creating more than five concurrent global containers.

### Local mode

For local mode, the backend first limits a run to `100` SKU-location series. It then follows this path:

```text
raw CSV in S3
    |
    v
local-runs SQS queue
    |
    v
orchestrator Lambda creates a series manifest
    |
    v
local-batches SQS queue
    |
    v
dedicated local batch worker Lambda (R ECR image)
    |
    v
per-batch S3 artifacts -> final aggregation -> run-root artifacts
```

The dispatch step reads the CSV, resolves its SKU and store columns, and builds a manifest of `series_key` values. A series is one SKU or one SKU-location combination, depending on the uploaded columns.

The configured local batch size is currently `2` series, via `FORECAST_LOCAL_BATCH_SIZE`. It is not a ten-thousand-record batch. For example:

- `40` local series create `20` batch messages.
- The local limit of `100` series creates at most `50` batch messages at the current batch size.
- Each batch still reads the source data, then filters it to its assigned series keys before forecasting.

The dedicated local batch worker has a reserved concurrency limit of `20`, so no more than twenty local batches execute at once. This cap protects Lambda compute and downstream AWS calls without limiting global runs.

## Artifact Writing And Aggregation

Each global run writes its artifacts directly to the run root. A local batch writes its intermediate artifacts under a batch-specific prefix, for example:

`tenant-artifacts/<tenantId>/runs/<runId>/batches/batch-0001/`

Batch completion updates DynamoDB counters. The batch that observes all batches completed atomically claims aggregation, reads the intermediate outputs, combines them, and writes the final run-root artifacts:

- `daily_forecasts.json`
- `monthly_forecasts.json`
- `monthly_totals.json`
- `metadata.json`
- `report_summary.json`
- `replenishment_signals.json`
- `sku_forecast_values.json`

The aggregation guard prevents two batches from publishing competing final outputs. The dashboard uses the run-root artifacts only; it does not need to know whether the run was global or local.

## Why SQS Polling Exists

SQS is needed only for local distributed work. It provides durable messages, retries, and controlled parallel execution while a local run is split into many independent series groups.

Lambda must poll an SQS queue to discover messages. It uses long polling, so this is AWS infrastructure polling, not browser polling and not one request per dashboard user.

There are two active local-work queues:

1. The local-runs queue triggers the orchestrator dispatch step.
2. The local-batches queue triggers the dedicated batch worker.

At low traffic, Lambda can reduce each mapping to as few as two long-poll readers. The old batch mapping had a mapping-level `maximum_concurrency` setting, which prevented that reduction and caused a high baseline of empty SQS receives. The worker concurrency limit now lives on the dedicated worker Lambda instead, so local capacity remains capped at `20` while idle queue traffic is lower.

## Global Failure Queue

The `forecasting-forecast-global-failures` queue is different from the two work queues:

- it is a Lambda asynchronous failure destination for global runs
- it has no Lambda event-source mapping and therefore no idle polling cost
- Lambda sends an invocation record there only if a global async event cannot complete within its retry and maximum-age policy

This preserves failed global work for operational investigation instead of silently dropping it. It is not an automatic rerun queue. An operator should inspect the failed invocation, fix the root cause where required, then restart the run through the normal application flow.

## Example: A 40-Series Local Run

1. The user uploads a sales-history CSV from `/data-input`.
2. The CSV is written to the tenant raw S3 prefix.
3. The user selects local mode and starts the run.
4. The orchestrator validates the file, creates the snapshot/run records, and sends one local dispatch message.
5. The dispatcher discovers `40` series, writes a manifest, and sends `20` two-series batch messages.
6. Up to `20` batch worker Lambda containers process those messages concurrently.
7. Each worker writes its batch artifacts and increments its run counter.
8. After the twentieth successful batch, one worker aggregates the batch outputs into the run-root artifact set and marks the run `DONE`.
9. The dashboard, KPIs, reports, and replenishment pages read the final run-root artifacts.

## Cost And Safety Boundaries

- Browser uploads use pre-signed S3 URLs; the browser does not run the forecasting code.
- Backend validation and plan limits constrain rows, series, history, and target values before work starts.
- Global execution is capped at `5` concurrent Lambda invocations.
- Local execution is capped at `20` concurrent series-batch workers.
- Local work queues keep retries and durable handoff.
- The global failure queue is inactive unless a global async run fails, so it does not add idle polling requests.
- The current two-series local batch size is intentionally conservative. Increasing it could reduce per-run SQS message count, but should only be changed after measuring R duration and memory use because oversized batches can cause retries or timeouts.

## Relevant Code

- Dashboard upload/start: `inventory-dashboard/app/api/upload-url/route.ts`, `inventory-dashboard/app/api/forecast/start/route.ts`
- Orchestration and local dispatch: `forecasting-core/src/orchestrator/lib/handlers.js`
- R forecast and aggregation: `forecasting-core/src/scripts/forecast.R`
- Lambda and queue infrastructure: `forecasting-core/terraform/lambda.tf`, `forecasting-core/terraform/sqs.tf`
