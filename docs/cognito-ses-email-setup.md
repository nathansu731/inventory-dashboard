# Cognito And SES Email Setup

This document covers the production-ready email setup for ARK Forecasting sign-up and account emails.

There are two separate email paths in this app:

1. Cognito-owned user emails
   These include signup verification, resend confirmation, and password reset messages.
2. App-owned SES emails
   These include help-center forwarding and the admin notification sent when a user signs up.

Only the second path is controlled by app code. If Cognito is still using the default `no-reply@verificationemail.com` sender, user-facing auth emails can still land in spam even after app code changes.

## Current App Behavior

After the current code changes:

- User signup still goes through Cognito in [app/api/auth/signup/route.ts](/Users/aroshasumanaweera/Projects/ARKForecasting/inventory-dashboard/app/api/auth/signup/route.ts:1)
- On successful signup, the app now sends a best-effort SES admin notification email with:
  - first name
  - last name
  - email
  - generated tenant ID
  - Cognito user sub when available
  - whether Cognito already marked the user confirmed
  - timestamp and origin
- The signup notification is sent:
  - from `AWS_SES_FROM_EMAIL`
  - to `SIGNUP_NOTIFICATION_TO_EMAIL` if set
  - otherwise to `HELP_CENTER_FORWARD_TO_EMAIL`
  - otherwise to `info@arkforecasting.com.au`
- Help-center mail continues to use SES as before.

Shared SES sender config now lives in:

- [lib/transactional-email.ts](/Users/aroshasumanaweera/Projects/ARKForecasting/inventory-dashboard/lib/transactional-email.ts:1)

## Required Manual AWS And DNS Steps

These steps are still manual. Code cannot complete them for you.

### 1. Verify The Domain In SES

In AWS SES, in `ap-southeast-2`:

- verify the domain `arkforecasting.com.au`
- enable DKIM during verification
- add the SES verification and DKIM DNS records exactly as provided

Do not stop at verifying only a single mailbox if this is for production use.

### 2. Ensure SPF And DMARC Exist

In your DNS for `arkforecasting.com.au`, make sure:

- SPF exists and permits the mail path you are using
- DMARC exists

SES DKIM alone is not the full deliverability setup.

### 3. Move SES Out Of Sandbox

If SES in `ap-southeast-2` is still in sandbox:

- Cognito/SES sending may be limited
- app-owned SES mail may also be constrained

Check SES account details and request production access if needed.

### 4. Switch Cognito User Pool Email To SES

For the Cognito user pool:

- user pool ID: `ap-southeast-2_H2HTaeDYt`
- region: `ap-southeast-2`

In the Cognito console:

1. Open the user pool.
2. Go to `Message delivery` or `Email`.
3. Change sender from Cognito default mail to Amazon SES.
4. Set:
   - `From email`: `info@arkforecasting.com.au` or `no-reply@arkforecasting.com.au`
   - `Reply-to email`: monitored support mailbox, typically `info@arkforecasting.com.au`
   - `SES Region`: `ap-southeast-2`

This is the critical deliverability fix for user-facing verification/reset emails.

### 5. Update Cognito Message Templates

In the same user pool:

- update verification/resend/reset subjects and bodies
- make sure the copy clearly says ARK Forecasting / ARK Dashboard

This is not just branding. Recognizable sender and message content improve trust and reduce user confusion.

### 6. Test With Fresh Signups

After the SES and Cognito switch:

- create a fresh signup
- confirm the verification email sender is your domain, not `verificationemail.com`
- check inbox placement in Gmail/Outlook
- confirm the admin notification arrives at `info@arkforecasting.com.au`

## App Env Vars

Relevant app env vars:

- `AWS_REGION`
- `AWS_SES_FROM_EMAIL`
- `HELP_CENTER_FORWARD_TO_EMAIL`
- optional `SIGNUP_NOTIFICATION_TO_EMAIL`

Recommended production values:

- `AWS_SES_FROM_EMAIL=info@arkforecasting.com.au`
- `HELP_CENTER_FORWARD_TO_EMAIL=info@arkforecasting.com.au`
- `SIGNUP_NOTIFICATION_TO_EMAIL=info@arkforecasting.com.au`

If you omit `SIGNUP_NOTIFICATION_TO_EMAIL`, signup alerts fall back to `HELP_CENTER_FORWARD_TO_EMAIL`.

## What Is Fixed In Code Vs Still Open

Fixed in code:

- signup now notifies the app admin mailbox through SES
- SES sender config is centralized for app-owned mail
- help-center and signup notifications use the same sender model

Still open until manual AWS work is done:

- Cognito verification emails will keep using the default Cognito sender unless the user pool is switched to SES
- domain reputation and inbox placement will remain weak if SES domain verification, DKIM, SPF, DMARC, or sandbox exit are incomplete

## Suggested Rollout Order

1. Verify domain and DKIM in SES.
2. Confirm SPF and DMARC in DNS.
3. Confirm SES production access.
4. Set app env vars in Vercel/local.
5. Switch Cognito user pool email delivery to SES.
6. Test fresh signup and password reset.
