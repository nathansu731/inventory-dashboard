import crypto from "crypto"
import {
  computeNextImportAt,
  computeRetryImportAt,
  type DataSourceRecord,
  type DataSourceProvider,
  type TenantRecord,
} from "@/lib/data-sources"
import { decryptSecret } from "@/lib/data-source-secrets"

type SyncResult = {
  source: DataSourceRecord
  run: {
    id: string
    status: "success" | "error"
    message: string
    startedAt: string
    finishedAt: string
  }
  ok: boolean
  errorCode?: string
}

const baseRun = () => {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    startedAt: now,
    finishedAt: now,
  }
}

const failResult = ({
  source,
  runBase,
  message,
  errorCode,
  terminal = false,
}: {
  source: DataSourceRecord
  runBase: { id: string; startedAt: string; finishedAt: string }
  message: string
  errorCode: string
  terminal?: boolean
}): SyncResult => {
  const run = { ...runBase, status: "error" as const, message }
  return {
    ok: false,
    errorCode,
    run,
    source: {
      ...source,
      state: terminal ? "error" : "connected",
      retryCount: source.retryCount + 1,
      lastError: message,
      nextImportAt: terminal ? null : computeRetryImportAt(run.finishedAt, source.retryCount + 1),
      runs: [run, ...source.runs].slice(0, 20),
      updatedAt: run.finishedAt,
    },
  }
}

const secretEntryFor = (tenantRecord: TenantRecord, sourceId: string) => {
  const secretMap =
    typeof tenantRecord.dataSourceSecrets === "object" && tenantRecord.dataSourceSecrets
      ? (tenantRecord.dataSourceSecrets as Record<string, unknown>)
      : {}

  return typeof secretMap[sourceId] === "object" && secretMap[sourceId]
    ? (secretMap[sourceId] as Record<string, unknown>)
    : null
}

const validateProviderCredentials = async ({
  provider,
  secretEntry,
  runBase,
  source,
}: {
  provider: DataSourceProvider
  secretEntry: Record<string, unknown> | null
  runBase: { id: string; startedAt: string; finishedAt: string }
  source: DataSourceRecord
}): Promise<SyncResult | null> => {
  if (provider === "shopify") {
    const shopDomain = typeof secretEntry?.shopDomain === "string" ? secretEntry.shopDomain.trim().toLowerCase() : ""
    const accessToken = await decryptSecret(secretEntry?.accessToken)
    if (!shopDomain || !accessToken) {
      return failResult({
        source,
        runBase,
        message: "Shopify credentials missing. Reconnect Shopify to continue imports.",
        errorCode: "missing_shopify_credentials",
        terminal: true,
      })
    }
    try {
      const probe = await fetch(`https://${shopDomain}/admin/api/2024-10/shop.json`, {
        method: "GET",
        headers: { "X-Shopify-Access-Token": accessToken },
        cache: "no-store",
      })
      if (probe.ok) return null
      return failResult({
        source,
        runBase,
        message:
          probe.status === 401 || probe.status === 403
            ? "Shopify authentication failed. Please reconnect Shopify."
            : "Shopify is temporarily unavailable. Automatic retry scheduled.",
        errorCode: probe.status === 401 || probe.status === 403 ? "shopify_token_invalid" : "shopify_transient_error",
        terminal: probe.status === 401 || probe.status === 403,
      })
    } catch {
      return failResult({
        source,
        runBase,
        message: "Shopify network error. Automatic retry scheduled.",
        errorCode: "shopify_network_error",
      })
    }
  }

  if (provider === "quickbooks") {
    const realmId = typeof secretEntry?.realmId === "string" ? secretEntry.realmId.trim() : ""
    let accessToken = await decryptSecret(secretEntry?.accessToken)
    const refreshToken = await decryptSecret(secretEntry?.refreshToken)
    if (!realmId || (!accessToken && !refreshToken)) {
      return failResult({
        source,
        runBase,
        message: "QuickBooks credentials missing. Reconnect QuickBooks to continue imports.",
        errorCode: "missing_quickbooks_credentials",
        terminal: true,
      })
    }

    const qbClientId = process.env.QUICKBOOKS_CLIENT_ID || ""
    const qbClientSecret = process.env.QUICKBOOKS_CLIENT_SECRET || ""
    if (refreshToken && qbClientId && qbClientSecret) {
      const basic = Buffer.from(`${qbClientId}:${qbClientSecret}`, "utf8").toString("base64")
      const tokenRes = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      })
      if (tokenRes.ok) {
        const payload = (await tokenRes.json()) as { access_token?: string }
        if (payload.access_token) accessToken = payload.access_token
      }
    }

    if (!accessToken) {
      return failResult({
        source,
        runBase,
        message: "QuickBooks token refresh failed. Please reconnect QuickBooks.",
        errorCode: "quickbooks_refresh_failed",
        terminal: true,
      })
    }

    try {
      const probe = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      })
      if (probe.ok) return null
      return failResult({
        source,
        runBase,
        message:
          probe.status === 401 || probe.status === 403
            ? "QuickBooks authentication failed. Please reconnect QuickBooks."
            : "QuickBooks is temporarily unavailable. Automatic retry scheduled.",
        errorCode: probe.status === 401 || probe.status === 403 ? "quickbooks_token_invalid" : "quickbooks_transient_error",
        terminal: probe.status === 401 || probe.status === 403,
      })
    } catch {
      return failResult({
        source,
        runBase,
        message: "QuickBooks network error. Automatic retry scheduled.",
        errorCode: "quickbooks_network_error",
      })
    }
  }

  if (provider === "bigcommerce") {
    const context = typeof secretEntry?.context === "string" ? secretEntry.context.trim() : ""
    const accessToken = await decryptSecret(secretEntry?.accessToken)
    if (!context || !accessToken) {
      return failResult({
        source,
        runBase,
        message: "BigCommerce credentials missing. Reconnect BigCommerce to continue imports.",
        errorCode: "missing_bigcommerce_credentials",
        terminal: true,
      })
    }

    try {
      const probe = await fetch(`https://api.bigcommerce.com/${context}/v2/store`, {
        method: "GET",
        headers: {
          "X-Auth-Token": accessToken,
          Accept: "application/json",
        },
        cache: "no-store",
      })
      if (probe.ok) return null
      return failResult({
        source,
        runBase,
        message:
          probe.status === 401 || probe.status === 403
            ? "BigCommerce authentication failed. Please reconnect BigCommerce."
            : "BigCommerce is temporarily unavailable. Automatic retry scheduled.",
        errorCode: probe.status === 401 || probe.status === 403 ? "bigcommerce_token_invalid" : "bigcommerce_transient_error",
        terminal: probe.status === 401 || probe.status === 403,
      })
    } catch {
      return failResult({
        source,
        runBase,
        message: "BigCommerce network error. Automatic retry scheduled.",
        errorCode: "bigcommerce_network_error",
      })
    }
  }

  if (provider === "amazon") {
    const refreshToken = await decryptSecret(secretEntry?.refreshToken)
    const clientId = process.env.AMAZON_LWA_CLIENT_ID || ""
    const clientSecret = process.env.AMAZON_LWA_CLIENT_SECRET || ""
    if (!refreshToken || !clientId || !clientSecret) {
      return failResult({
        source,
        runBase,
        message: "Amazon credentials missing. Reconnect Amazon to continue imports.",
        errorCode: "missing_amazon_credentials",
        terminal: true,
      })
    }
    try {
      const tokenRes = await fetch("https://api.amazon.com/auth/o2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      })
      if (tokenRes.ok) return null
      return failResult({
        source,
        runBase,
        message:
          tokenRes.status === 401 || tokenRes.status === 403
            ? "Amazon authentication failed. Please reconnect Amazon."
            : "Amazon token endpoint is unavailable. Automatic retry scheduled.",
        errorCode: tokenRes.status === 401 || tokenRes.status === 403 ? "amazon_token_invalid" : "amazon_transient_error",
        terminal: tokenRes.status === 401 || tokenRes.status === 403,
      })
    } catch {
      return failResult({
        source,
        runBase,
        message: "Amazon network error. Automatic retry scheduled.",
        errorCode: "amazon_network_error",
      })
    }
  }

  return null
}

export const runSourceSync = async (
  tenantRecord: TenantRecord,
  sourceId: string,
  source: DataSourceRecord
): Promise<SyncResult> => {
  const runBase = baseRun()
  if (source.provider === "other") {
    const adapterMap =
      typeof tenantRecord.dataSourceAdapters === "object" && tenantRecord.dataSourceAdapters
        ? (tenantRecord.dataSourceAdapters as Record<string, unknown>)
        : {}
    const adapterEntry =
      typeof adapterMap[sourceId] === "object" && adapterMap[sourceId]
        ? (adapterMap[sourceId] as Record<string, unknown>)
        : null
    if (!adapterEntry) {
      return failResult({
        source,
        runBase,
        message: "Adapter template configuration is required for Other sources.",
        errorCode: "missing_other_adapter_config",
        terminal: true,
      })
    }
  }

  if (source.provider !== "other") {
    const validation = await validateProviderCredentials({
      provider: source.provider,
      secretEntry: secretEntryFor(tenantRecord, sourceId),
      runBase,
      source,
    })
    if (validation) return validation
  }

  const successMessage = `Imported ${source.selectedTables.length} table(s).`
  const run = { ...runBase, status: "success" as const, message: successMessage }
  return {
    ok: true,
    run,
    source: {
      ...source,
      state: "connected",
      lastImportAt: run.finishedAt,
      nextImportAt: computeNextImportAt(source.syncMode, run.finishedAt),
      retryCount: 0,
      lastError: null,
      runs: [run, ...source.runs].slice(0, 20),
      updatedAt: run.finishedAt,
    },
  }
}
