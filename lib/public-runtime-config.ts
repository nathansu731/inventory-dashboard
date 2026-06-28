import type { AuthProviderProps } from "react-oidc-context";

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

const requireValue = (name: string, value: string) => {
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
};

export const isProductionRuntime = () => process.env.NODE_ENV === "production";

export const getPublicGraphqlEndpoint = () => {
  const endpoint = trim(process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || "");
  if (endpoint) return endpoint;
  if (!isProductionRuntime()) return "http://localhost:4000/graphql";
  throw new Error("Missing NEXT_PUBLIC_GRAPHQL_ENDPOINT");
};

export type PublicCognitoConfig = {
  authority: string;
  clientId: string;
  domain: string;
  identityProviders: {
    apple: string;
    facebook: string;
    google: string;
  };
  logoutUri: string;
  redirectUri: string;
  scope: string;
};

export const getPublicCognitoConfig = (): PublicCognitoConfig => {
  const authority = normalizeOptionalUrl(process.env.NEXT_PUBLIC_COGNITO_AUTHORITY || "");
  const clientId = trim(process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "");
  const domain = normalizeHostedUiDomain(process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "");
  const redirectUri =
    trim(process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI || "") ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const logoutUri = trim(process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URI || "");
  const scope = trim(process.env.NEXT_PUBLIC_COGNITO_SCOPE || "") || "openid profile email";

  if (isProductionRuntime()) {
    requireValue("NEXT_PUBLIC_COGNITO_AUTHORITY", authority);
    requireValue("NEXT_PUBLIC_COGNITO_CLIENT_ID", clientId);
    requireValue("NEXT_PUBLIC_COGNITO_DOMAIN", domain);
    requireValue("NEXT_PUBLIC_COGNITO_REDIRECT_URI", redirectUri);
    requireValue("NEXT_PUBLIC_COGNITO_LOGOUT_URI", logoutUri);
  }

  return {
    authority,
    clientId,
    domain,
    identityProviders: {
      apple: trim(process.env.NEXT_PUBLIC_COGNITO_IDP_APPLE || ""),
      facebook: trim(process.env.NEXT_PUBLIC_COGNITO_IDP_FACEBOOK || ""),
      google: trim(process.env.NEXT_PUBLIC_COGNITO_IDP_GOOGLE || ""),
    },
    logoutUri,
    redirectUri,
    scope,
  };
};

export const getClientOidcConfig = (): AuthProviderProps => {
  const cognito = getPublicCognitoConfig();
  return {
    authority: cognito.authority,
    client_id: cognito.clientId,
    redirect_uri: cognito.redirectUri,
    response_type: "code",
    scope: cognito.scope,
  };
};

export const buildHostedAuthorizeUrl = (provider?: string) => {
  const cognito = getPublicCognitoConfig();
  const authorizeEndpoint = `${requireValue("NEXT_PUBLIC_COGNITO_DOMAIN", cognito.domain)}/oauth2/authorize`;
  const params = new URLSearchParams({
    client_id: requireValue("NEXT_PUBLIC_COGNITO_CLIENT_ID", cognito.clientId),
    redirect_uri: requireValue("NEXT_PUBLIC_COGNITO_REDIRECT_URI", cognito.redirectUri),
    response_type: "code",
    scope: cognito.scope,
  });

  if (provider) {
    params.set("identity_provider", provider);
  }

  return `${authorizeEndpoint}?${params.toString()}`;
};
