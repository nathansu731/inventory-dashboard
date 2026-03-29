import { NextResponse } from "next/server"
import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses"
import { z } from "zod"
import { getValidIdToken } from "@/lib/server-auth"

export const runtime = "nodejs"

const MAX_TOTAL_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024
const ACCEPTED_MIME_TYPES = ["application/pdf"] as const

const helpCenterSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  category: z.string().trim().min(1).max(120),
  subject: z.string().trim().max(200).optional().default(""),
  message: z.string().trim().min(1).max(5000),
})

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

const wrapBase64 = (value: string) => value.replace(/(.{76})/g, "$1\r\n")

export async function POST(request: Request) {
  const { idToken, cookiesToSet } = await getValidIdToken()
  if (!idToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const region = process.env.AWS_REGION || ""
  const fromEmail = process.env.AWS_SES_FROM_EMAIL || ""
  const toEmail = process.env.HELP_CENTER_FORWARD_TO_EMAIL || "info@arkforecasting.com.au"

  if (!region || !fromEmail) {
    return NextResponse.json(
      { error: "Missing required SES config. Set AWS_REGION and AWS_SES_FROM_EMAIL." },
      { status: 500 }
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 })
  }

  const parsed = helpCenterSchema.safeParse({
    name: String(formData.get("name") || ""),
    email: String(formData.get("email") || ""),
    category: String(formData.get("category") || ""),
    subject: String(formData.get("subject") || ""),
    message: String(formData.get("message") || ""),
  })

  if (!parsed.success) {
    return NextResponse.json({ error: "Please complete all required fields with valid values." }, { status: 400 })
  }

  const attachments = formData
    .getAll("attachments")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)

  const totalBytes = attachments.reduce((sum, file) => sum + file.size, 0)
  if (totalBytes > MAX_TOTAL_ATTACHMENT_SIZE_BYTES) {
    return NextResponse.json({ error: "Attachments exceed the 10MB total limit." }, { status: 400 })
  }

  for (const file of attachments) {
    const isImage = file.type.startsWith("image/")
    const isPdf = ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])
    if (!isImage && !isPdf) {
      return NextResponse.json({ error: `Unsupported attachment type: ${file.name}` }, { status: 400 })
    }
  }

  const { name, email, category, subject, message } = parsed.data
  const mailSubject = `[Help Center] ${category}${subject ? ` - ${subject}` : ""}`

  const textBody = [
    "New Help Center inquiry",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Category: ${category}`,
    `Subject: ${subject || "-"}`,
    "",
    "Message:",
    message,
    "",
    `Attachments: ${attachments.length}`,
    `Submitted At: ${new Date().toISOString()}`,
  ].join("\n")

  const htmlBody = `
    <h2>New Help Center inquiry</h2>
    <table style="border-collapse:collapse;border:1px solid #ddd">
      <tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:600">Name</td><td style="padding:6px 10px;border:1px solid #ddd">${escapeHtml(name)}</td></tr>
      <tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:600">Email</td><td style="padding:6px 10px;border:1px solid #ddd">${escapeHtml(email)}</td></tr>
      <tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:600">Category</td><td style="padding:6px 10px;border:1px solid #ddd">${escapeHtml(category)}</td></tr>
      <tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:600">Subject</td><td style="padding:6px 10px;border:1px solid #ddd">${escapeHtml(subject || "-")}</td></tr>
      <tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:600">Submitted At</td><td style="padding:6px 10px;border:1px solid #ddd">${escapeHtml(new Date().toISOString())}</td></tr>
      <tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:600">Message</td><td style="padding:6px 10px;border:1px solid #ddd;white-space:pre-wrap">${escapeHtml(message)}</td></tr>
      <tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:600">Attachments</td><td style="padding:6px 10px;border:1px solid #ddd">${attachments.length}</td></tr>
    </table>
  `

  const mixedBoundary = `MixedBoundary_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const altBoundary = `AltBoundary_${Date.now()}_${Math.random().toString(36).slice(2)}`

  const parts: string[] = []
  parts.push(`From: ${fromEmail}`)
  parts.push(`To: ${toEmail}`)
  parts.push(`Reply-To: ${email}`)
  parts.push(`Subject: ${mailSubject}`)
  parts.push("MIME-Version: 1.0")
  parts.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`)
  parts.push("")
  parts.push(`--${mixedBoundary}`)
  parts.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`)
  parts.push("")
  parts.push(`--${altBoundary}`)
  parts.push('Content-Type: text/plain; charset="UTF-8"')
  parts.push("Content-Transfer-Encoding: 7bit")
  parts.push("")
  parts.push(textBody)
  parts.push("")
  parts.push(`--${altBoundary}`)
  parts.push('Content-Type: text/html; charset="UTF-8"')
  parts.push("Content-Transfer-Encoding: 7bit")
  parts.push("")
  parts.push(htmlBody)
  parts.push("")
  parts.push(`--${altBoundary}--`)

  for (const file of attachments) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = file.name.replaceAll('"', "")
    parts.push("")
    parts.push(`--${mixedBoundary}`)
    parts.push(`Content-Type: ${file.type}; name="${fileName}"`)
    parts.push(`Content-Disposition: attachment; filename="${fileName}"`)
    parts.push("Content-Transfer-Encoding: base64")
    parts.push("")
    parts.push(wrapBase64(buffer.toString("base64")))
  }

  parts.push("")
  parts.push(`--${mixedBoundary}--`)
  parts.push("")

  const rawMessage = parts.join("\r\n")

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  const sesClient = new SESClient({
    region,
    credentials:
      accessKeyId && secretAccessKey
        ? {
            accessKeyId,
            secretAccessKey,
          }
        : undefined,
  })

  try {
    await sesClient.send(
      new SendRawEmailCommand({
        RawMessage: {
          Data: Buffer.from(rawMessage),
        },
      })
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to send inquiry email.",
        providerError: String(error),
      },
      { status: 502 }
    )
  }

  const response = NextResponse.json({ success: true })
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  return response
}
