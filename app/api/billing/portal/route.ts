import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getValidIdToken } from "@/lib/server-auth"

export async function POST(request: Request) {
  const { idToken, cookiesToSet } = await getValidIdToken()
  if (!idToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: { customerId?: string; returnUrl?: string } = {}
  try {
    body = (await request.json()) as { customerId?: string; returnUrl?: string }
  } catch {
    body = {}
  }

  const customerId = typeof body.customerId === "string" ? body.customerId : ""
  if (!customerId) {
    const response = NextResponse.json({ error: "missing_customer_id" }, { status: 400 })
    for (const cookie of cookiesToSet) {
      response.cookies.set(cookie.name, cookie.value, cookie.options)
    }
    return response
  }

  const origin = (() => {
    try {
      const url = new URL(request.url)
      return `${url.protocol}//${url.host}`
    } catch {
      return ""
    }
  })()

  const defaultReturnUrl = origin ? `${origin}/billing` : "http://localhost:3000/billing"
  const returnUrl = typeof body.returnUrl === "string" && body.returnUrl ? body.returnUrl : defaultReturnUrl

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    const response = NextResponse.json({ url: session.url })
    for (const cookie of cookiesToSet) {
      response.cookies.set(cookie.name, cookie.value, cookie.options)
    }
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : "portal_session_failed"
    const response = NextResponse.json({ error: message }, { status: 500 })
    for (const cookie of cookiesToSet) {
      response.cookies.set(cookie.name, cookie.value, cookie.options)
    }
    return response
  }
}
