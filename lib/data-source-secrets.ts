import crypto from "crypto"

type EncryptedValue = {
  alg: "aes-256-gcm"
  iv: string
  tag: string
  ciphertext: string
}

const parseKey = (raw: string) => {
  const key = Buffer.from(raw, "base64")
  if (key.length !== 32) throw new Error("invalid_data_source_encryption_key_length")
  return key
}

const readEnvKey = () => {
  const raw = process.env.DATA_SOURCE_ENCRYPTION_KEY || ""
  if (!raw) return null

  try {
    return parseKey(raw)
  } catch {
    throw new Error("invalid_data_source_encryption_key")
  }
}

const parseSecretPayload = (raw: string) => {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error("empty_data_source_encryption_secret")

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    const candidate =
      typeof parsed.DATA_SOURCE_ENCRYPTION_KEY === "string"
        ? parsed.DATA_SOURCE_ENCRYPTION_KEY
        : typeof parsed.key === "string"
          ? parsed.key
          : ""
    if (candidate) return parseKey(candidate)
  } catch {
    // fall through to plain base64 handling
  }

  return parseKey(trimmed)
}

let keyPromise: Promise<Buffer> | null = null

const readKey = async (): Promise<Buffer> => {
  if (keyPromise) return keyPromise
  keyPromise = (async () => {
    try {
      const envKey = readEnvKey()
      if (envKey) return envKey

      const inlineSecret = process.env.DATA_SOURCE_ENCRYPTION_KEY_JSON || ""
      if (inlineSecret) return parseSecretPayload(inlineSecret)

      throw new Error("missing_data_source_encryption_key")
    } catch {
      throw new Error("invalid_data_source_encryption_key")
    }
  })().catch((error) => {
    keyPromise = null
    throw error
  })

  return keyPromise
}

export const encryptSecret = async (plaintext: string): Promise<EncryptedValue> => {
  const key = await readKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return {
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: encrypted.toString("base64"),
  }
}

export const decryptSecret = async (value: unknown): Promise<string | null> => {
  const input = typeof value === "object" && value ? (value as Record<string, unknown>) : null
  if (!input) return null
  if (input.alg !== "aes-256-gcm") return null
  if (typeof input.iv !== "string" || typeof input.tag !== "string" || typeof input.ciphertext !== "string") {
    return null
  }

  try {
    const key = await readKey()
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(input.iv, "base64"))
    decipher.setAuthTag(Buffer.from(input.tag, "base64"))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(input.ciphertext, "base64")),
      decipher.final(),
    ])
    return decrypted.toString("utf8")
  } catch {
    return null
  }
}
