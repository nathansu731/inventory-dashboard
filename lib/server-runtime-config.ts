import "server-only";

const trim = (value: string) => value.trim();
const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const normalizeOptionalUrl = (value: string) => {
  const trimmed = trim(value);
  return trimmed ? stripTrailingSlash(trimmed) : "";
};

const normalizeHostedUiDomain = (value: string) => {
  const normalized = normalizeOptionalUrl(value);
  if (!normalized) return "";
  return normalized.endsWith("/oauth2") ? normalized.slice(0, -"/oauth2".length) : normalized;
};

const parseRegionFromDomain = (domain: string) => {
  if (!domain) return "";
  try {
    const host = new URL(domain).host;
    const match = host.match(/auth\.([a-z0-9-]+)\.amazoncognito\.com$/i);
    return match?.[1] || "";
  } catch {
    return "";
  }
};

const parseRegionFromAuthority = (authority: string) => {
  if (!authority) return "";
  try {
    const host = new URL(authority).host;
    const match = host.match(/^cognito-idp\.([a-z0-9-]+)\.amazonaws\.com$/i);
    return match?.[1] || "";
  } catch {
    return "";
  }
};

const parseRegionFromUserPoolId = (userPoolId: string) => {
  const match = trim(userPoolId).match(/^([a-z0-9-]+)_/i);
  return match?.[1] || "";
};

const requireValue = (name: string, value: string) => {
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
};

const requireAligned = (leftName: string, leftValue: string, rightName: string, rightValue: string) => {
  if (leftValue && rightValue && leftValue !== rightValue) {
    throw new Error(`${leftName} must match ${rightName}`);
  }
};

export const getServerGraphqlEndpoint = () => {
  const appsyncUrl = trim(process.env.APPSYNC_API_URL || "");
  const publicUrl = trim(process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || "");
  requireAligned("APPSYNC_API_URL", appsyncUrl, "NEXT_PUBLIC_GRAPHQL_ENDPOINT", publicUrl);

  const endpoint = appsyncUrl || publicUrl;
  return requireValue("APPSYNC_API_URL", endpoint);
};

export type ServerCognitoConfig = {
  authority: string;
  authorizeEndpoint: string;
  clientId: string;
  clientSecret: string;
  domain: string;
  logoutEndpoint: string;
  logoutUri: string;
  redirectUri: string;
  region: string;
  scope: string;
  tokenEndpoint: string;
  userPoolId: string;
};

export const getServerCognitoConfig = (): ServerCognitoConfig => {
  const authority = normalizeOptionalUrl(process.env.NEXT_PUBLIC_COGNITO_AUTHORITY || "");
  const clientId = trim(process.env.COGNITO_CLIENT_ID || process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "");
  const publicClientId = trim(process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "");
  const clientSecret = trim(process.env.COGNITO_CLIENT_SECRET || "");
  const domain = normalizeHostedUiDomain(process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "");
  const redirectUri = trim(process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI || "");
  const logoutUri = trim(process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URI || "");
  const scope = trim(process.env.NEXT_PUBLIC_COGNITO_SCOPE || "") || "openid profile email";
  const userPoolId = trim(process.env.COGNITO_USER_POOL_ID || "");

  requireAligned("COGNITO_CLIENT_ID", trim(process.env.COGNITO_CLIENT_ID || ""), "NEXT_PUBLIC_COGNITO_CLIENT_ID", publicClientId);

  const region =
    trim(process.env.COGNITO_REGION || "") ||
    parseRegionFromDomain(domain) ||
    parseRegionFromAuthority(authority) ||
    parseRegionFromUserPoolId(userPoolId) ||
    trim(process.env.AWS_REGION || "");

  return {
    authority,
    authorizeEndpoint: `${requireValue("NEXT_PUBLIC_COGNITO_DOMAIN", domain)}/oauth2/authorize`,
    clientId: requireValue("COGNITO_CLIENT_ID", clientId),
    clientSecret,
    domain: requireValue("NEXT_PUBLIC_COGNITO_DOMAIN", domain),
    logoutEndpoint: `${requireValue("NEXT_PUBLIC_COGNITO_DOMAIN", domain)}/logout`,
    logoutUri,
    redirectUri: requireValue("NEXT_PUBLIC_COGNITO_REDIRECT_URI", redirectUri),
    region: requireValue("COGNITO_REGION", region),
    scope,
    tokenEndpoint: `${requireValue("NEXT_PUBLIC_COGNITO_DOMAIN", domain)}/oauth2/token`,
    userPoolId,
  };
};

export const getServerAwsRegion = () => {
  const region = trim(process.env.AWS_REGION || "") || trim(process.env.COGNITO_REGION || "");
  return requireValue("AWS_REGION", region);
};
