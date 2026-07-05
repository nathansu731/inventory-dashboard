import Link from "next/link"
import { ArrowLeft } from "lucide-react"

type LegalSection = {
  title: string
  paragraphs: readonly string[]
  bullets?: readonly string[]
}

type LegalDocumentPageProps = {
  title: string
  summary: string
  updatedAt: string
  sections: readonly LegalSection[]
}

export function LegalDocumentPage({ title, summary, updatedAt, sections }: LegalDocumentPageProps) {
  return (
    <main className="min-h-svh bg-muted/40 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>

        <div className="rounded-2xl border bg-background shadow-sm">
          <div className="border-b px-8 py-8">
            <p className="text-sm font-medium text-primary">ARK Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{summary}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">Last updated {updatedAt}</p>
          </div>

          <div className="px-8 py-8">
            <div className="space-y-8">
              {sections.map((section) => (
                <section key={section.title} className="space-y-3">
                  <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-muted-foreground">
                      {paragraph}
                    </p>
                  ))}
                  {section.bullets?.length ? (
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>

            <div className="mt-10 rounded-xl bg-muted/60 p-5 text-sm leading-6 text-muted-foreground">
              Questions about these terms can be sent to{" "}
              <a className="text-primary underline underline-offset-4" href="mailto:info@arkforecasting.com.au">
                info@arkforecasting.com.au
              </a>
              .
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
