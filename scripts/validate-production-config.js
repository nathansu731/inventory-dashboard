#!/usr/bin/env node

const args = process.argv.slice(2);
const labelIndex = args.indexOf("--label");
const label = labelIndex === -1 ? "" : String(args[labelIndex + 1] || "").trim();

const requiredBackendEnv = [
  "AWS_REGION",
  "COGNITO_REGION",
  "COGNITO_USER_POOL_ID",
  "APPSYNC_API_URL",
  "NEXT_PUBLIC_GRAPHQL_ENDPOINT",
  "S3_RAW_BUCKET",
  "TENANTS_TABLE",
  "ENTITLEMENTS_TABLE",
  "NOTIFICATIONS_TABLE",
  "DATA_SOURCES_TABLE",
  "SAVED_REPORTS_TABLE",
  "WORKER_CRON_TOKEN",
];

const requiredCognitoEnv = [
  "NEXT_PUBLIC_COGNITO_AUTHORITY",
  "NEXT_PUBLIC_COGNITO_DOMAIN",
  "NEXT_PUBLIC_COGNITO_CLIENT_ID",
  "NEXT_PUBLIC_COGNITO_REDIRECT_URI",
  "NEXT_PUBLIC_COGNITO_LOGOUT_URI",
  "COGNITO_CLIENT_SECRET",
];

const requiredStripeEnv = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PRICE_ID_LAUNCH",
  "NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL",
];

const requiredSesEnv = [
  "AWS_SES_FROM_EMAIL",
  "HELP_CENTER_FORWARD_TO_EMAIL",
];

const connectorGroups = [
  {
    name: "shopify",
    vars: ["SHOPIFY_CLIENT_ID", "SHOPIFY_CLIENT_SECRET", "SHOPIFY_REDIRECT_URI"],
  },
  {
    name: "quickbooks",
    vars: ["QUICKBOOKS_CLIENT_ID", "QUICKBOOKS_CLIENT_SECRET", "QUICKBOOKS_REDIRECT_URI"],
  },
  {
    name: "bigcommerce",
    vars: ["BIGCOMMERCE_CLIENT_ID", "BIGCOMMERCE_CLIENT_SECRET", "BIGCOMMERCE_REDIRECT_URI"],
  },
  {
    name: "amazon",
    vars: [
      "AMAZON_SP_APPLICATION_ID",
      "AMAZON_LWA_CLIENT_ID",
      "AMAZON_LWA_CLIENT_SECRET",
      "AMAZON_REDIRECT_URI",
    ],
  },
];

const errors = [];
const warnings = [];
const notes = [];

const get = (name) => String(process.env[name] || "").trim();

const requireVars = (vars, group) => {
  for (const name of vars) {
    if (!get(name)) {
      errors.push(`${group}: missing ${name}`);
    }
  }
};

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value);
const isLocalValue = (value) => /(localhost|127\.0\.0\.1|example\.com|dev|staging)/i.test(value);

const parseRegionFromAuthority = (authority) => {
  try {
    const match = new URL(authority).host.match(/^cognito-idp\.([a-z0-9-]+)\.amazonaws\.com$/i);
    return match?.[1] || "";
  } catch {
    return "";
  }
};

const parseRegionFromDomain = (domain) => {
  try {
    const base = domain.replace(/\/oauth2\/?$/i, "");
    const match = new URL(base).host.match(/auth\.([a-z0-9-]+)\.amazoncognito\.com$/i);
    return match?.[1] || "";
  } catch {
    return "";
  }
};

requireVars(requiredBackendEnv, "backend");
requireVars(requiredCognitoEnv, "cognito");
requireVars(requiredStripeEnv, "stripe");
requireVars(requiredSesEnv, "ses");

if (!get("DATA_SOURCE_ENCRYPTION_KEY") && !get("DATA_SOURCE_ENCRYPTION_KEY_JSON")) {
  errors.push("connectors: missing DATA_SOURCE_ENCRYPTION_KEY or DATA_SOURCE_ENCRYPTION_KEY_JSON");
}

for (const group of connectorGroups) {
  const present = group.vars.filter((name) => get(name));
  if (present.length === 0) {
    notes.push(`connector ${group.name}: disabled`);
    continue;
  }
  if (present.length !== group.vars.length) {
    errors.push(`connector ${group.name}: incomplete config (${present.join(", ")})`);
    continue;
  }
  notes.push(`connector ${group.name}: configured`);
}

const appsyncUrl = get("APPSYNC_API_URL");
const publicGraphqlUrl = get("NEXT_PUBLIC_GRAPHQL_ENDPOINT");
if (appsyncUrl && publicGraphqlUrl && appsyncUrl !== publicGraphqlUrl) {
  errors.push("graphql: APPSYNC_API_URL must equal NEXT_PUBLIC_GRAPHQL_ENDPOINT");
}
if (publicGraphqlUrl && !isAbsoluteUrl(publicGraphqlUrl)) {
  errors.push("graphql: NEXT_PUBLIC_GRAPHQL_ENDPOINT must be an absolute URL");
}
if (appsyncUrl && !isAbsoluteUrl(appsyncUrl)) {
  errors.push("graphql: APPSYNC_API_URL must be an absolute URL");
}

const publicClientId = get("NEXT_PUBLIC_COGNITO_CLIENT_ID");
const privateClientId = get("COGNITO_CLIENT_ID");
if (privateClientId && publicClientId && privateClientId !== publicClientId) {
  errors.push("cognito: COGNITO_CLIENT_ID must match NEXT_PUBLIC_COGNITO_CLIENT_ID");
}

const authority = get("NEXT_PUBLIC_COGNITO_AUTHORITY");
const domain = get("NEXT_PUBLIC_COGNITO_DOMAIN");
const redirectUri = get("NEXT_PUBLIC_COGNITO_REDIRECT_URI");
const logoutUri = get("NEXT_PUBLIC_COGNITO_LOGOUT_URI");
const cognitoRegion = get("COGNITO_REGION");
const authorityRegion = parseRegionFromAuthority(authority);
const domainRegion = parseRegionFromDomain(domain);

for (const [name, value] of [
  ["NEXT_PUBLIC_COGNITO_AUTHORITY", authority],
  ["NEXT_PUBLIC_COGNITO_DOMAIN", domain],
  ["NEXT_PUBLIC_COGNITO_REDIRECT_URI", redirectUri],
  ["NEXT_PUBLIC_COGNITO_LOGOUT_URI", logoutUri],
]) {
  if (value && !isAbsoluteUrl(value)) {
    errors.push(`cognito: ${name} must be an absolute URL`);
  }
}

if (authorityRegion && cognitoRegion && authorityRegion !== cognitoRegion) {
  errors.push("cognito: NEXT_PUBLIC_COGNITO_AUTHORITY region does not match COGNITO_REGION");
}
if (domainRegion && cognitoRegion && domainRegion !== cognitoRegion) {
  errors.push("cognito: NEXT_PUBLIC_COGNITO_DOMAIN region does not match COGNITO_REGION");
}

const prodOnlyChecks = [
  "NEXT_PUBLIC_GRAPHQL_ENDPOINT",
  "NEXT_PUBLIC_COGNITO_REDIRECT_URI",
  "NEXT_PUBLIC_COGNITO_LOGOUT_URI",
  "NEXT_PUBLIC_COGNITO_DOMAIN",
  "AWS_SES_FROM_EMAIL",
  "HELP_CENTER_FORWARD_TO_EMAIL",
];

for (const name of prodOnlyChecks) {
  const value = get(name);
  if (value && isLocalValue(value)) {
    warnings.push(`${name}: looks like a dev/staging value (${value})`);
  }
}

const stripeSecretKey = get("STRIPE_SECRET_KEY");
if (stripeSecretKey && /^sk_test_/i.test(stripeSecretKey)) {
  warnings.push("STRIPE_SECRET_KEY: using a Stripe test key");
}

const webhookSecret = get("STRIPE_WEBHOOK_SECRET");
if (webhookSecret && /^whsec_test/i.test(webhookSecret)) {
  warnings.push("STRIPE_WEBHOOK_SECRET: value looks like a non-prod placeholder");
}

console.log(`Dashboard deploy config validation${label ? ` (${label})` : ""}`);
console.log("");

if (notes.length > 0) {
  console.log("Notes:");
  for (const note of notes) console.log(`- ${note}`);
  console.log("");
}

if (warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
  console.log("");
}

if (errors.length > 0) {
  console.error("Errors:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Config passed.");
