# Inventory Dashboard

See [docs/vercel-env-checklist.md](/Users/aroshasumanaweera/Projects/ARKForecasting/inventory-dashboard/docs/vercel-env-checklist.md:1) for the Vercel environment checklist split by generated values, manual plain-text config, and secrets.

## Production config

Backend-owned dashboard env should come from Terraform outputs, not hand-copying table names, bucket names, or the AppSync URL.

Generate the backend env file after `terraform apply`:

```bash
node ../forecasting-core/ops/export-dashboard-env.js
```

This writes a workspace-specific generated file:

- dev/default workspace -> `.env.develop.generated`
- prod workspace -> `.env.production.generated`

You can override the target explicitly:

```bash
node ../forecasting-core/ops/export-dashboard-env.js --env develop
node ../forecasting-core/ops/export-dashboard-env.js --env production
node ../forecasting-core/ops/export-dashboard-env.js --out .env.local
```

The generated file contains:

- `AWS_REGION`
- `COGNITO_REGION`
- `COGNITO_USER_POOL_ID`
- `APPSYNC_API_URL`
- `NEXT_PUBLIC_GRAPHQL_ENDPOINT`
- `S3_RAW_BUCKET`
- `TENANTS_TABLE`
- `ENTITLEMENTS_TABLE`
- `NOTIFICATIONS_TABLE`
- `DATA_SOURCES_TABLE`
- `SAVED_REPORTS_TABLE`
- `WORKER_CRON_TOKEN`

You still need a separate non-generated env source for values Terraform in this repo does not own:

- Cognito hosted UI and app client settings
- Stripe secrets and price IDs
- SES sender/forwarding addresses
- Connector OAuth credentials
- `DATA_SOURCE_ENCRYPTION_KEY` or `DATA_SOURCE_ENCRYPTION_KEY_JSON`

Run the deploy validator before deploy:

```bash
npm run validate:deploy-config
```

Or validate the generated environments directly:

```bash
npm run validate:develop
npm run validate:production
npm run validate:all-envs
```

These commands load:

- `validate:develop` -> `.env.develop.generated` and optional `.env.develop.local`
- `validate:production` -> `.env.production.generated` and optional `.env.production.local`

It checks dev/prod:

- server/client GraphQL endpoint alignment
- Cognito public/server config alignment
- required backend, Stripe, SES, and worker env presence
- connector env completeness
- obvious dev/test placeholders in prod values

## Dashboard smoke flow

After deploy, validate the authenticated upload-to-results path end to end:

```bash
DASHBOARD_BASE_URL=https://<dashboard-domain> \
DASHBOARD_COOKIE_HEADER='id_token=...; access_token=...; refresh_token=...' \
npm run smoke:dashboard-flow
```

The smoke script performs:

1. `POST /api/upload-url`
2. signed S3 upload to the quarantine prefix
3. `POST /api/forecast/start`
4. run polling via `GET /api/list-forecast-runs`
5. result checks via:
   `GET /api/get-daily-forecasts`
   `GET /api/get-report-summary`
   `GET /api/get-replenishment-signals`

## Connector and worker env

Connector sync and the internal worker still require:

```bash
DATA_SOURCE_ENCRYPTION_KEY=...
WORKER_CRON_TOKEN=...

SHOPIFY_CLIENT_ID=...
SHOPIFY_CLIENT_SECRET=...
SHOPIFY_REDIRECT_URI=https://<dashboard-domain>/api/data-sources/shopify/callback

QUICKBOOKS_CLIENT_ID=...
QUICKBOOKS_CLIENT_SECRET=...
QUICKBOOKS_REDIRECT_URI=https://<dashboard-domain>/api/data-sources/quickbooks/callback

BIGCOMMERCE_CLIENT_ID=...
BIGCOMMERCE_CLIENT_SECRET=...
BIGCOMMERCE_REDIRECT_URI=https://<dashboard-domain>/api/data-sources/bigcommerce/callback

AMAZON_SP_APPLICATION_ID=...
AMAZON_LWA_CLIENT_ID=...
AMAZON_LWA_CLIENT_SECRET=...
AMAZON_REDIRECT_URI=https://<dashboard-domain>/api/data-sources/amazon/callback
```
