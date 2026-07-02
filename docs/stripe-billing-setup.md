# Stripe Billing Setup

This document captures the Stripe setup for the current `inventory-dashboard` implementation.

## What This Project Uses

This project uses Stripe for direct SaaS billing.

Used:

- Products
- Prices
- Checkout Sessions
- Webhooks
- Customer / subscription state sync into Cognito and DynamoDB

Not used:

- Stripe Connect
- connected accounts
- marketplace payouts

## Current Code Paths

Main files:

- [lib/stripe.js](/Users/aroshasumanaweera/Projects/ARKForecasting/inventory-dashboard/lib/stripe.js:1)
- [app/api/checkout_sessions/route.js](/Users/aroshasumanaweera/Projects/ARKForecasting/inventory-dashboard/app/api/checkout_sessions/route.js:1)
- [app/api/subscription-plans/route.ts](/Users/aroshasumanaweera/Projects/ARKForecasting/inventory-dashboard/app/api/subscription-plans/route.ts:1)
- [app/api/stripe/webhook/route.ts](/Users/aroshasumanaweera/Projects/ARKForecasting/inventory-dashboard/app/api/stripe/webhook/route.ts:1)

Environment variables used directly by billing:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_LAUNCH`
- `STRIPE_PRICE_ID_PROFESSIONAL`
- `STRIPE_PRICE_ID_ENTERPRISE`
- `NEXT_PUBLIC_STRIPE_PRICE_ID_LAUNCH`
- `NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL`
- `NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE`

## Account Activation

Use the legal business identity that matches the payout bank account owner.

If the bank account name is:

`ARK SOFTWARE SOLUTIONS PTY LTD AS TRUSTEES FOR ARK SOFTWARE SOLUTIONS FAMILY TRUST`

the safer setup is usually:

- onboard using the legal entity that matches that bank account owner
- provide the representative / directors for the trustee company
- provide controlling people / beneficial owners Stripe asks for

Do not assume the bare trust name by itself is the correct Stripe entity unless your accountant confirms that.

## Products And Prices

Create or confirm three plan prices in the live Stripe account:

- Launch
- Professional
- Enterprise

These become:

- `STRIPE_PRICE_ID_LAUNCH`
- `STRIPE_PRICE_ID_PROFESSIONAL`
- `STRIPE_PRICE_ID_ENTERPRISE`

The dashboard also exposes matching public price IDs:

- `NEXT_PUBLIC_STRIPE_PRICE_ID_LAUNCH`
- `NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL`
- `NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE`

Recommended rule:

- keep `STRIPE_PRICE_ID_*` and `NEXT_PUBLIC_STRIPE_PRICE_ID_*` the same per plan

## Secret Key

Use the live secret key for the server:

- `STRIPE_SECRET_KEY=sk_live_...`

For the current code, this is the key the server uses for:

- creating checkout sessions
- retrieving prices
- retrieving customers / subscriptions
- webhook follow-up API calls

Current note:

- this project does not currently use `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_API_KEY_ID` is not used by current dashboard code

## Webhook Setup

Create a Stripe webhook endpoint for the dashboard.

Endpoint URL:

`https://<your-dashboard-domain>/api/stripe/webhook`

Example:

`https://app.arkforecasting.com.au/api/stripe/webhook`

Choose event source:

- `Your account`

Do not use:

- `Connected accounts`

Select only these event types, because these are the ones handled in code:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

After creating the endpoint:

1. Open the endpoint in Stripe.
2. Reveal the signing secret.
3. Set it as:
   `STRIPE_WEBHOOK_SECRET=whsec_...`

Important:

- `STRIPE_WEBHOOK_SECRET` comes from the webhook endpoint page
- it does not come from `Developers -> API keys`

## Testing The Webhook

After setting `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in the target environment:

1. Redeploy the dashboard.
2. Use Stripe `Send test event`.
3. Test:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `invoice.payment_failed`

Expected result:

- Stripe receives `2xx`
- the webhook route accepts the signature
- tenant / entitlement / Cognito subscription state updates

## Subscription State Sync

The webhook updates:

- Cognito custom attributes
- tenant billing state in DynamoDB
- entitlements records

That behavior is implemented in [app/api/stripe/webhook/route.ts](/Users/aroshasumanaweera/Projects/ARKForecasting/inventory-dashboard/app/api/stripe/webhook/route.ts:242).

## Pricing Flexibility

Stripe is flexible enough for negotiated or temporary tenant-specific deals.

Supported approaches:

- longer trials for specific tenants
- lower prices for a fixed number of months
- tenant-specific custom prices
- grandfathered plans

Recommended usage:

- longer free trial:
  per-subscription trial configuration
- discounted first 6 months:
  subscription schedule or time-bounded discount
- negotiated tenant-only pricing:
  dedicated price IDs or backend-controlled pricing overrides

Do not rely on public promotion codes for private negotiated contracts.

Store the tenant’s special billing terms in your app/backend, not only in Stripe metadata.

## Prod Setup Checklist

1. Activate the Stripe live account using the correct legal business identity.
2. Create or verify live products and prices.
3. Copy live price IDs into dashboard env vars.
4. Reveal the live secret key and store it in Vercel:
   `STRIPE_SECRET_KEY`
5. Create the webhook endpoint.
6. Copy the webhook signing secret into Vercel:
   `STRIPE_WEBHOOK_SECRET`
7. Run dashboard env validation.
8. Redeploy.
9. Send Stripe test events.

## Safe Handling Notes

- It is fine to reveal the live secret key when provisioning envs.
- Copy it directly into secure env storage such as Vercel.
- Do not keep it in notes, screenshots, or committed files.
- Treat the webhook secret the same way.
