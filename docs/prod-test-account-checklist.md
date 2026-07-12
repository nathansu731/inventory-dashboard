# Production Test Account Checklist

Use this checklist when creating a fresh test account in the production environment.

The goal is not only to see that signup works, but also to confirm that the expected Cognito, SES, DynamoDB, S3, and forecast runtime side effects are all happening.

Related references:

- [docs/cognito-ses-email-setup.md](/Users/aroshasumanaweera/Projects/ARKForecasting/inventory-dashboard/docs/cognito-ses-email-setup.md:1)
- [docs/forecast-run-lifecycle.md](/Users/aroshasumanaweera/Projects/ARKForecasting/inventory-dashboard/docs/forecast-run-lifecycle.md:1)
- [docs/data-source-architecture.md](/Users/aroshasumanaweera/Projects/ARKForecasting/inventory-dashboard/docs/data-source-architecture.md:1)

## Before You Start

Confirm production config is in place:

- production dashboard env is pointing to prod backend resources
- Cognito production user pool and hosted UI are configured
- SES sender setup is complete for production domain mail
- Stripe production config is present if you want to test billing
- you have AWS console or CLI access to the prod account

Useful prod resources to know in advance:

- Cognito user pool
- raw S3 bucket
- artifacts S3 bucket
- DynamoDB tables:
  - `TENANTS_TABLE`
  - `ENTITLEMENTS_TABLE`
  - `NOTIFICATIONS_TABLE`
  - `DATA_SOURCES_TABLE`
  - `SAVED_REPORTS_TABLE`
  - backend-only forecast tables:
    - `forecast_runs_table`
    - `data_snapshots_table`

## App Checklist

### 1. Signup Page

Create a fresh account from `/signup`.

Check:

- form submits without `missing_config` or Cognito errors
- user is redirected to `/confirm?...&sent=1` if email confirmation is required
- sender of the verification email is your production domain, not Cognito default mail
- verification email lands in inbox, not spam

### 2. Email Confirmation

Confirm the user with the code from the email.

Check:

- `/confirm` succeeds
- user is redirected to `/login?signup=confirmed`

### 3. First Login

Login with the new user.

Check:

- login succeeds without auth errors
- redirect lands on `/overview`
- auth cookies are present
- the user can open the main authenticated routes:
  - `/overview`
  - `/data-input`
  - `/account-and-subscription`
  - `/profile`

### 4. Trial / Access State

For a brand new tenant, the default expected state is trial access.

Check in app:

- account can access normal product pages
- account is not immediately sent to an expired trial screen
- `/account-and-subscription` shows a sensible default plan/trial state

Expected initial values from current code:

- tenant status: `trialing`
- tenant plan: `launch`

### 5. Admin Signup Notification

The app now sends a best-effort admin notification email on signup.

Check:

- `info@arkforecasting.com.au` or your configured admin mailbox receives the signup email
- email includes:
  - first name
  - last name
  - email
  - tenant ID
  - Cognito user sub
  - submitted timestamp

### 6. Optional Data Upload Smoke Test

From `/data-input`, request an upload and start a basic forecast smoke run.

Check:

- upload request succeeds
- file upload succeeds
- forecast can be started
- status polling works
- result pages load:
  - dashboard
  - reports
  - replenishments
  - forecasting summary

## AWS Checklist

## Cognito

Check the production user pool for the new user.

Expected:

- user exists in Cognito
- `email` is correct
- `given_name` is correct
- `family_name` is correct
- `custom:tenant_id` exists
- user status is confirmed after code confirmation

If using the hosted UI callback/login path, the app also synchronizes tenant membership on first successful login.

## SES

Check the email path used for production auth mail and app mail.

Expected:

- Cognito email delivery is configured to use Amazon SES
- From address is your domain mail, typically `info@arkforecasting.com.au` or `no-reply@arkforecasting.com.au`
- admin signup notification email is sent from `AWS_SES_FROM_EMAIL`
- SES is not blocked by sandbox restrictions

If verification mail still comes from `verificationemail.com`, Cognito is still on the default sender and production email setup is incomplete.

## DynamoDB

### `TENANTS_TABLE`

A tenant record should exist after signup.

Expected fields from current app behavior:

- `tenantId`
- `name`
- `primaryUserEmail`
- `status=trialing`
- `plan=launch`
- `trialStartedAt`
- `trialEndsAt`
- `createdAt`

User state nuance:

- immediately after signup, the user entry may still show `inviteState=sent`
- after the first successful authenticated callback/login, the user entry should be updated to:
  - `inviteState=accepted`
  - `isActive=true`
  - `isDeleted=false`
  - `role=admin`
  - `acceptedAt` set

### `ENTITLEMENTS_TABLE`

For a brand new trial account, this table may still be empty unless billing or entitlement sync has run.

Check:

- no conflicting stale entitlement exists for the new tenant
- later, if billing is tested, entitlement state matches the Stripe status

### `NOTIFICATIONS_TABLE`

For signup-only testing, this may be empty.

After a forecast run, check:

- new notification rows exist for the tenant
- run-related notifications can be read from `/notifications`

### `DATA_SOURCES_TABLE`

For a brand new tenant, this should usually be empty until a connector is added.

After connecting a source, check:

- rows are created for that tenant
- provider, selected tables, state, and sync metadata look correct

### `SAVED_REPORTS_TABLE`

For a brand new tenant, this should usually be empty.

After saving a report, check:

- a row is created for the tenant
- it appears in `/reports/saved-reports`

### Forecast Backend Tables

These are primarily backend-side, but matter if you test an actual run.

Check:

- `forecast_runs_table` gets a row for the new run
- `data_snapshots_table` gets the snapshot metadata needed by the run

## S3

### Raw Bucket

The dashboard upload flow writes into the raw bucket using a quarantine prefix.

Check:

- object appears in the prod raw bucket
- key is under the tenant-scoped quarantine path, not a shared loose root
- content type matches the uploaded file

### Artifacts Bucket

If you run a forecast, the backend should write artifacts here.

Check:

- an artifact prefix exists for the new run
- expected outputs exist for that run, especially:
  - `daily_forecasts.json`
  - `monthly_totals.json`
  - `report_summary.json`
  - `replenishment_signals.json`
  - `sku_forecast_values.json`

## Lambda / Queue / Logs

If you perform an upload and forecast run:

- orchestrator Lambda should be invoked
- forecast runtime Lambda should be invoked
- SQS should not leave the run stuck in backlog
- CloudWatch logs should show the new tenant/run flowing through normally

Useful checks:

- no permission or missing-env errors
- no tenant access restriction errors for the new tenant
- no missing artifact write errors

## Billing / Stripe Optional Checks

If you also want to test billing:

- launch checkout from `/account-and-subscription`
- ensure Stripe customer/subscription is created in the prod account
- confirm webhook processing updates tenant and entitlement state

Expected post-billing checks:

- tenant status is still valid for access
- entitlement row exists or updates correctly
- billing portal opens successfully

## Recommended Test Order

1. Signup
2. Confirm email
3. First login
4. Check tenant record in DynamoDB
5. Check admin signup email arrived
6. Open authenticated app pages
7. Upload a small CSV
8. Start one forecast run
9. Check S3 raw object
10. Check forecast run + snapshot rows
11. Check artifact outputs in S3
12. Check notifications and replenishments UI
13. Optionally test billing

## Common Failure Signs

- verification email comes from Cognito default sender instead of your domain
- signup works but no tenant row exists
- tenant row exists but first login never flips user state to accepted
- upload URL works but S3 object never appears
- run starts but no forecast run row is created
- artifacts bucket is empty for the run
- notifications page stays empty after a completed run
- new account is immediately treated as expired or blocked

## Minimal Success Definition

A production test account is in good shape if all of the following are true:

- user can sign up, confirm, and log in
- Cognito and SES mail use the production domain sender
- `TENANTS_TABLE` contains a valid trial tenant record
- the user is attached to that tenant as admin
- an upload can be created in the raw bucket
- a forecast run can complete
- expected artifacts are written
- notifications and main result pages load for that tenant
