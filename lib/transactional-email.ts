import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses"
import { getServerAwsRegion } from "@/lib/server-runtime-config"

type SendTransactionalEmailInput = {
  to: string | string[]
  subject: string
  textBody: string
  htmlBody?: string
  replyTo?: string | string[]
}

const toAddressList = (value: string | string[]) =>
  (Array.isArray(value) ? value : [value]).map((entry) => entry.trim()).filter(Boolean)

export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

export const getTransactionalEmailConfig = () => {
  let region = ""
  try {
    region = getServerAwsRegion()
  } catch {
    region = ""
  }

  return {
    fromEmail: (process.env.AWS_SES_FROM_EMAIL || "").trim(),
    region,
    signupNotificationToEmail: (
      process.env.SIGNUP_NOTIFICATION_TO_EMAIL ||
      process.env.HELP_CENTER_FORWARD_TO_EMAIL ||
      "info@arkforecasting.com.au"
    ).trim(),
  }
}

export const canSendTransactionalEmail = () => {
  const { fromEmail, region } = getTransactionalEmailConfig()
  return Boolean(fromEmail && region)
}

export async function sendTransactionalEmail({
  to,
  subject,
  textBody,
  htmlBody,
  replyTo,
}: SendTransactionalEmailInput) {
  const { fromEmail, region } = getTransactionalEmailConfig()
  if (!fromEmail || !region) {
    throw new Error("missing_ses_config")
  }

  const toAddresses = toAddressList(to)
  const replyToAddresses = replyTo ? toAddressList(replyTo) : undefined

  if (toAddresses.length === 0) {
    throw new Error("missing_recipient")
  }

  const sesClient = new SESClient({ region })
  await sesClient.send(
    new SendEmailCommand({
      Source: fromEmail,
      Destination: { ToAddresses: toAddresses },
      ReplyToAddresses: replyToAddresses?.length ? replyToAddresses : undefined,
      Message: {
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
        Body: {
          Text: {
            Charset: "UTF-8",
            Data: textBody,
          },
          ...(htmlBody
            ? {
                Html: {
                  Charset: "UTF-8",
                  Data: htmlBody,
                },
              }
            : {}),
        },
      },
    })
  )
}
