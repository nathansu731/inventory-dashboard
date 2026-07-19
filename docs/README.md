# Documentation Map

This folder contains product and architecture documentation for the current ARK Forecasting application.

## Current Documents

### Product structure

- `product-domain-and-page-map.md`
  - product purpose
  - main domain objects
  - page responsibilities
  - navigation areas

### Data ingestion

- `data-source-architecture.md`
  - CSV and connected-source ingestion
  - provider setup model
  - canonical normalized forecast shape
  - connector sync and inventory integration

### Data model

- `data-model-and-artifacts.md`
  - raw data layers
  - run records and snapshots
  - generated artifact set
  - page-to-artifact usage

### Run flow

- `forecast-run-lifecycle.md`
  - end-to-end lifecycle from intake to artifacts and page consumption
  - scenario and replenishment flow
  - reporting and Copilot dependencies
- `forecast-execution-and-queueing.md`
  - plain-language CSV-to-forecast execution flow
  - local versus global model execution
  - SQS polling, batch worker, aggregation, and failure queue behavior

### Guardrails

- `security-and-guardrails.md`
  - auth and tenant isolation
  - upload restrictions
  - rate limits
  - audit logging
  - Copilot and operational safeguards

## Recommended Reading Order

For product orientation:
1. `product-domain-and-page-map.md`
2. `data-model-and-artifacts.md`
3. `forecast-run-lifecycle.md`

For ingestion and operations:
1. `data-source-architecture.md`
2. `security-and-guardrails.md`

## Notes

These docs reflect the current implemented behavior across:
- `inventory-dashboard`
- `forecasting-core`

They are intended to describe the live architecture and product behavior, not a future-state redesign.
