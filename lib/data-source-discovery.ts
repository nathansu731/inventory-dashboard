import type { DataSourceProvider, DataSourceRecord, TenantRecord } from "@/lib/data-sources"
import { decryptSecret } from "@/lib/data-source-secrets"
import crypto from "crypto"

type ProviderCatalogEntry = {
  objects: string[]
  defaultSelected: string[]
}

type ProviderCatalog = Record<DataSourceProvider, ProviderCatalogEntry>

const emptyCatalog = (): ProviderCatalog => ({
  shopify: { objects: [], defaultSelected: [] },
  amazon: { objects: [], defaultSelected: [] },
  quickbooks: { objects: [], defaultSelected: [] },
  bigcommerce: { objects: [], defaultSelected: [] },
  other: { objects: [], defaultSelected: [] },
})

const unique = (items: string[]) => Array.from(new Set(items))

const pickDefaults = (objects: string[]) => objects.slice(0, Math.min(2, objects.length))

const readSecretEntry = (tenantRecord: TenantRecord, sourceId: string) => {
  const raw = tenantRecord.dataSourceSecrets
  const map = typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {}
  const entry = map[sourceId]
  return typeof entry === "object" && entry ? (entry as Record<string, unknown>) : null
}

const probe = async (url: string, init: RequestInit) => {
  try {
    const res = await fetch(url, { ...init, cache: "no-store" })
    return res.ok
  } catch {
    return false
  }
}

const discoverShopify = async (source: DataSourceRecord, secretEntry: Record<string, unknown> | null) => {
  const shopDomain = typeof secretEntry?.shopDomain === "string" ? secretEntry.shopDomain.trim().toLowerCase() : ""
  const accessToken = await decryptSecret(secretEntry?.accessToken)
  if (!shopDomain || !accessToken) return []

  const base = `https://${shopDomain}/admin/api/2024-10`
  const headers = { "X-Shopify-Access-Token": accessToken }
  const candidates: Array<{ key: string; path: string }> = [
    { key: "orders", path: "/orders.json?limit=1&status=any" },
    { key: "products", path: "/products.json?limit=1" },
    { key: "customers", path: "/customers.json?limit=1" },
    { key: "inventory_levels", path: "/inventory_levels.json?limit=1" },
  ]

  const checks = await Promise.all(
    candidates.map(async (candidate) => ({
      key: candidate.key,
      ok: await probe(`${base}${candidate.path}`, { method: "GET", headers }),
    }))
  )
  return checks.filter((item) => item.ok).map((item) => item.key)
}

const refreshQuickBooksToken = async (refreshToken: string) => {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID || ""
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET || ""
  if (!clientId || !clientSecret) return null

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64")
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
      cache: "no-store",
    })
    if (!tokenRes.ok) return null
    const payload = (await tokenRes.json()) as { access_token?: string }
    return payload.access_token || null
  } catch {
    return null
  }
}

const discoverQuickBooks = async (_source: DataSourceRecord, secretEntry: Record<string, unknown> | null) => {
  const realmId = typeof secretEntry?.realmId === "string" ? secretEntry.realmId.trim() : ""
  let accessToken = await decryptSecret(secretEntry?.accessToken)
  const refreshToken = await decryptSecret(secretEntry?.refreshToken)
  if (!realmId) return []
  if (!accessToken && refreshToken) {
    accessToken = await refreshQuickBooksToken(refreshToken)
  }
  if (!accessToken) return []

  const headers = { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }
  const base = `https://quickbooks.api.intuit.com/v3/company/${realmId}`
  const candidates: Array<{ key: string; query: string }> = [
    { key: "invoices", query: "select * from Invoice maxresults 1" },
    { key: "sales_receipts", query: "select * from SalesReceipt maxresults 1" },
    { key: "items", query: "select * from Item maxresults 1" },
    { key: "customers", query: "select * from Customer maxresults 1" },
    { key: "purchase_orders", query: "select * from Purchase maxresults 1" },
  ]

  const checks = await Promise.all(
    candidates.map(async (candidate) => {
      const url = `${base}/query?query=${encodeURIComponent(candidate.query)}`
      return { key: candidate.key, ok: await probe(url, { method: "GET", headers }) }
    })
  )
  return checks.filter((item) => item.ok).map((item) => item.key)
}

const discoverBigCommerce = async (_source: DataSourceRecord, secretEntry: Record<string, unknown> | null) => {
  const context = typeof secretEntry?.context === "string" ? secretEntry.context.trim() : ""
  const accessToken = await decryptSecret(secretEntry?.accessToken)
  if (!context || !accessToken) return []

  const base = `https://api.bigcommerce.com/${context}`
  const headers = { "X-Auth-Token": accessToken, Accept: "application/json" }
  const candidates: Array<{ key: string; path: string }> = [
    { key: "orders", path: "/v2/orders?limit=1" },
    { key: "products", path: "/v3/catalog/products?limit=1" },
    { key: "variants", path: "/v3/catalog/variants?limit=1" },
    { key: "customers", path: "/v3/customers?limit=1" },
    { key: "inventory", path: "/v3/inventory/items?limit=1" },
  ]

  const checks = await Promise.all(
    candidates.map(async (candidate) => ({
      key: candidate.key,
      ok: await probe(`${base}${candidate.path}`, { method: "GET", headers }),
    }))
  )
  return checks.filter((item) => item.ok).map((item) => item.key)
}

const toHex = (value: string | Buffer) => crypto.createHash("sha256").update(value).digest("hex")

const hmac = (key: Buffer | string, value: string) => crypto.createHmac("sha256", key).update(value).digest()

const encodeRfc3986 = (value: string) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)

const canonicalQuery = (params: URLSearchParams) =>
  [...params.entries()]
    .sort(([aKey, aValue], [bKey, bValue]) => (aKey === bKey ? aValue.localeCompare(bValue) : aKey.localeCompare(bKey)))
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .join("&")

const signAndFetchAmazon = async ({
  url,
  accessToken,
  awsAccessKeyId,
  awsSecretAccessKey,
  awsSessionToken,
  region,
}: {
  url: URL
  accessToken: string
  awsAccessKeyId: string
  awsSecretAccessKey: string
  awsSessionToken?: string
  region: string
}) => {
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "")
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = toHex("")
  const host = url.host

  const headers: Record<string, string> = {
    host,
    "x-amz-access-token": accessToken,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  }
  if (awsSessionToken) headers["x-amz-security-token"] = awsSessionToken

  const signedHeaderNames = Object.keys(headers).sort()
  const canonicalHeaders = signedHeaderNames.map((key) => `${key}:${headers[key].trim()}\n`).join("")
  const signedHeaders = signedHeaderNames.join(";")
  const canonicalRequest = [
    "GET",
    url.pathname,
    canonicalQuery(url.searchParams),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n")

  const credentialScope = `${dateStamp}/${region}/execute-api/aws4_request`
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, toHex(canonicalRequest)].join("\n")
  const kDate = hmac(`AWS4${awsSecretAccessKey}`, dateStamp)
  const kRegion = hmac(kDate, region)
  const kService = hmac(kRegion, "execute-api")
  const kSigning = hmac(kService, "aws4_request")
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex")

  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${awsAccessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ")

  return fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: authorization,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      "x-amz-access-token": accessToken,
      ...(awsSessionToken ? { "x-amz-security-token": awsSessionToken } : {}),
    },
    cache: "no-store",
  })
}

const refreshAmazonAccessToken = async (refreshToken: string) => {
  const clientId = process.env.AMAZON_LWA_CLIENT_ID || ""
  const clientSecret = process.env.AMAZON_LWA_CLIENT_SECRET || ""
  if (!clientId || !clientSecret) return null

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
      cache: "no-store",
    })
    if (!tokenRes.ok) return null
    const payload = (await tokenRes.json()) as { access_token?: string }
    return payload.access_token || null
  } catch {
    return null
  }
}

const discoverAmazon = async (_source: DataSourceRecord, secretEntry: Record<string, unknown> | null) => {
  const sellerId = typeof secretEntry?.sellingPartnerId === "string" ? secretEntry.sellingPartnerId.trim() : ""
  const refreshToken = await decryptSecret(secretEntry?.refreshToken)
  if (!sellerId || !refreshToken) return []

  const accessToken = await refreshAmazonAccessToken(refreshToken)
  if (!accessToken) return []

  const awsAccessKeyId = process.env.AMAZON_SP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || ""
  const awsSecretAccessKey = process.env.AMAZON_SP_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || ""
  const awsSessionToken = process.env.AMAZON_SP_AWS_SESSION_TOKEN || process.env.AWS_SESSION_TOKEN || ""
  const baseUrl = process.env.AMAZON_SP_API_BASE_URL || "https://sellingpartnerapi-na.amazon.com"
  const region = process.env.AMAZON_SP_API_REGION || "us-east-1"

  if (!awsAccessKeyId || !awsSecretAccessKey) return []

  try {
    const sellersUrl = new URL("/sellers/v1/marketplaceParticipations", baseUrl)
    const sellersRes = await signAndFetchAmazon({
      url: sellersUrl,
      accessToken,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      region,
    })
    if (!sellersRes.ok) return []
    const sellersPayload = (await sellersRes.json()) as {
      payload?: Array<{ marketplace?: { id?: string } }>
    }
    const marketplaceId = sellersPayload.payload?.[0]?.marketplace?.id || ""
    if (!marketplaceId) return []

    const discovered: string[] = []
    const ordersUrl = new URL("/orders/v0/orders", baseUrl)
    ordersUrl.searchParams.set("MarketplaceIds", marketplaceId)
    ordersUrl.searchParams.set("CreatedAfter", new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString())
    const ordersRes = await signAndFetchAmazon({
      url: ordersUrl,
      accessToken,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      region,
    })
    if (ordersRes.ok) {
      discovered.push("orders", "order_items")
    }

    const inventoryUrl = new URL("/fba/inventory/v1/summaries", baseUrl)
    inventoryUrl.searchParams.set("granularityType", "Marketplace")
    inventoryUrl.searchParams.set("granularityId", marketplaceId)
    inventoryUrl.searchParams.set("marketplaceIds", marketplaceId)
    inventoryUrl.searchParams.set("details", "false")
    const inventoryRes = await signAndFetchAmazon({
      url: inventoryUrl,
      accessToken,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      region,
    })
    if (inventoryRes.ok) {
      discovered.push("inventory")
    }

    return unique(discovered)
  } catch {
    return []
  }
}

const discoverOther = async () => {
  return [] as string[]
}

const discoverByProvider = async (source: DataSourceRecord, secretEntry: Record<string, unknown> | null) => {
  if (source.provider === "shopify") return discoverShopify(source, secretEntry)
  if (source.provider === "quickbooks") return discoverQuickBooks(source, secretEntry)
  if (source.provider === "bigcommerce") return discoverBigCommerce(source, secretEntry)
  if (source.provider === "amazon") return discoverAmazon(source, secretEntry)
  return discoverOther()
}

export const discoverDataSourceCatalog = async (tenantRecord: TenantRecord, sourceMap: Record<string, DataSourceRecord>) => {
  const catalog = emptyCatalog()

  const tasks = Object.values(sourceMap)
    .filter((source) => source.state === "connected")
    .map(async (source) => {
      const secretEntry = readSecretEntry(tenantRecord, source.id)
      const discovered = unique(await discoverByProvider(source, secretEntry))
      const selected = unique((source.selectedTables || []).filter((item) => discovered.includes(item)))
      catalog[source.provider] = {
        objects: discovered,
        defaultSelected: selected.length > 0 ? selected : pickDefaults(discovered),
      }
    })

  await Promise.all(tasks)
  return catalog
}
