import type { Metadata } from "next"
import { LegalDocumentPage } from "@/components/legal/legal-document-page"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for ARK Dashboard.",
}

const sections = [
  {
    title: "Service scope",
    paragraphs: [
      "ARK Dashboard provides forecasting, reporting, replenishment, and data-connector workflows for business users. These terms apply to your access to the dashboard, its APIs, related uploads, generated outputs, and connected integrations.",
      "If your organisation has a separate order form, master services agreement, or reseller agreement with us, that commercial agreement controls where it conflicts with these website terms.",
    ],
  },
  {
    title: "Accounts and access",
    paragraphs: [
      "You must use accurate account information and keep your login credentials secure. You are responsible for activity performed through your account and for ensuring only authorised users access tenant data.",
      "If you are using the service on behalf of a company, trust, or other entity, you confirm that you are authorised to accept these terms for that organisation.",
    ],
  },
  {
    title: "Subscriptions, trials, and billing",
    paragraphs: [
      "Paid plans, trials, promotional pricing, and enterprise terms may vary by tenant. Unless a separate written commercial term says otherwise, subscription fees renew for the active billing period and may be cancelled before the next renewal takes effect.",
      "You are responsible for any taxes, duties, or bank fees associated with your subscription unless they are already included in quoted pricing.",
    ],
  },
  {
    title: "Acceptable use",
    paragraphs: [
      "You must not misuse the service, interfere with its operation, attempt unauthorised access, reverse engineer protected parts of the platform, or upload material that is unlawful, infringing, harmful, or deceptive.",
    ],
    bullets: [
      "Do not use the platform to compromise security or test credentials without permission.",
      "Do not upload data unless you have the right to process it through the service.",
      "Do not use the service to build competing automated access or scraping workflows against our systems.",
    ],
  },
  {
    title: "Customer data and outputs",
    paragraphs: [
      "You retain responsibility for the source data you upload or connect. You represent that you have the rights and consents needed to provide that data for forecasting, reporting, and operational workflows.",
      "Forecasts, replenishment suggestions, summaries, and generated reports are decision-support outputs. They are provided to assist planning and do not replace your own commercial, financial, supply-chain, or legal judgment.",
    ],
  },
  {
    title: "Third-party services",
    paragraphs: [
      "The platform may interact with third-party services such as AWS, Stripe, Cognito, Shopify, QuickBooks, BigCommerce, Amazon SP-API, and email providers. Your use of those integrations may also be subject to the third party's own terms and privacy policies.",
    ],
  },
  {
    title: "Availability and changes",
    paragraphs: [
      "We may update, improve, suspend, or discontinue features from time to time. We aim for reliable service, but we do not guarantee uninterrupted availability or error-free operation.",
      "We may modify these terms by posting an updated version on this site. Continued use after the effective update means you accept the revised terms.",
    ],
  },
  {
    title: "Termination",
    paragraphs: [
      "We may suspend or terminate access if these terms are breached, if payment obligations remain overdue, if continued service creates security or legal risk, or if an account becomes inactive for an extended period.",
      "On termination, your right to access the service ends, but provisions that reasonably survive termination, including payment obligations, liability limits, and data-use rights already granted for operational processing, continue as required.",
    ],
  },
  {
    title: "Warranties and liability",
    paragraphs: [
      "The service is provided on an as-is and as-available basis to the maximum extent permitted by law. We disclaim implied warranties except where they cannot legally be excluded.",
      "To the maximum extent permitted by law, we are not liable for indirect, incidental, special, consequential, or loss-of-profit damages, or for decisions made using forecasts or recommendations generated through the service. Our aggregate liability for claims relating to the service is limited to the fees paid for the affected service period unless a separate written agreement states otherwise.",
    ],
  },
] as const

export default function TermsPage() {
  return (
    <LegalDocumentPage
      title="Terms of Service"
      summary="These terms explain how ARK Dashboard may be accessed and used, including subscriptions, customer data responsibilities, and service limitations."
      updatedAt="4 July 2026"
      sections={[...sections]}
    />
  )
}
