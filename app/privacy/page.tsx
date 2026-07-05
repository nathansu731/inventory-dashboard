import type { Metadata } from "next"
import { LegalDocumentPage } from "@/components/legal/legal-document-page"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for ARK Dashboard.",
}

const sections = [
  {
    title: "What we collect",
    paragraphs: [
      "We collect information needed to operate the service, including account details, authentication identifiers, tenant and billing metadata, support communications, uploaded files, connector configuration, and operational logs.",
      "Depending on how you use the platform, connected commerce, accounting, or inventory systems may provide order, product, inventory, customer, or transaction data for forecasting and reporting workflows.",
    ],
  },
  {
    title: "How we use information",
    paragraphs: [
      "We use personal and business information to authenticate users, operate tenant environments, process uploads, generate forecasts and reports, provide support, administer billing, monitor reliability, and protect the platform against abuse or security incidents.",
    ],
    bullets: [
      "To create and manage user accounts",
      "To run forecasting, reporting, replenishment, and sync workflows",
      "To improve service performance, reliability, and support response",
      "To meet legal, accounting, fraud-prevention, and security obligations",
    ],
  },
  {
    title: "How information is shared",
    paragraphs: [
      "We do not sell personal information. We may share information with service providers and infrastructure partners that help us deliver the platform, such as hosting, authentication, billing, email, analytics, logging, and connector services.",
      "We may also disclose information where required by law, to enforce our agreements, to respond to security incidents, or as part of a business restructuring or sale.",
    ],
  },
  {
    title: "Data storage and security",
    paragraphs: [
      "We use commercially reasonable administrative, technical, and organisational safeguards to protect data processed through the service. No method of storage or transmission is completely secure, so we cannot guarantee absolute security.",
      "You are responsible for securing your own endpoints, credentials, integrations, and administrator access within your organisation.",
    ],
  },
  {
    title: "Retention",
    paragraphs: [
      "We keep information for as long as needed to provide the service, comply with legal or financial obligations, resolve disputes, enforce agreements, and maintain legitimate business records. Retention periods may differ by data type, subscription status, and backup cycle.",
    ],
  },
  {
    title: "International processing",
    paragraphs: [
      "Your information may be processed in cloud systems and by vendors operating in different jurisdictions. By using the service, you authorise that cross-border processing where necessary to deliver the platform.",
    ],
  },
  {
    title: "Your choices and rights",
    paragraphs: [
      "Subject to applicable law, you may request access to, correction of, or deletion of your personal information, or ask us to restrict certain processing. Some requests may be limited where we need to keep information for legal, security, contractual, or operational reasons.",
    ],
  },
  {
    title: "Cookies and authentication",
    paragraphs: [
      "The dashboard uses authentication sessions, security cookies, and similar technical mechanisms to keep users signed in, protect account flows, and support product functionality. Disabling required cookies may prevent the application from working correctly.",
    ],
  },
  {
    title: "Changes to this policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time. When we do, we will post the updated version on this page and revise the effective date.",
    ],
  },
] as const

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      title="Privacy Policy"
      summary="This policy explains what information ARK Dashboard processes, why it is used, how it is protected, and the limited circumstances where it may be shared."
      updatedAt="4 July 2026"
      sections={[...sections]}
    />
  )
}
