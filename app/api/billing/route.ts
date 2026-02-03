import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customerId") || ""
    const subscriptionId = searchParams.get("subscriptionId") || ""

    if (!customerId) {
        return NextResponse.json({})
    }

    let subscription = null

    if (subscriptionId) {
        try {
            subscription = await stripe.subscriptions.retrieve(subscriptionId, {
                expand: ["items.data.price"],
            })
        } catch (error) {
            subscription = null
        }
    }

    if (!subscription) {
        const list = await stripe.subscriptions.list({
            customer: customerId,
            status: "all",
            limit: 1,
            expand: ["data.items.data.price"],
        })
        subscription = list.data[0] || null
    }

    let nextInvoice = null
    try {
        nextInvoice = await stripe.invoices.retrieveUpcoming({
            customer: customerId,
            subscription: subscription?.id || undefined,
        })
    } catch (error) {
        nextInvoice = null
    }

    const lastPaymentList = await stripe.invoices.list({
        customer: customerId,
        status: "paid",
        limit: 1,
    })
    const lastPayment = lastPaymentList.data[0] || null

    const price = subscription?.items?.data?.[0]?.price

    return NextResponse.json({
        subscription: subscription
            ? {
                  subscription_id: subscription.id,
                  customer_id: subscription.customer,
                  status: subscription.status,
                  current_period_end: subscription.current_period_end,
                  cancel_at_period_end: subscription.cancel_at_period_end,
                  unit_amount: price?.unit_amount ?? null,
                  currency: price?.currency ?? null,
                  interval: price?.recurring?.interval ?? null,
              }
            : null,
        next_invoice: nextInvoice
            ? {
                  amount_due: nextInvoice.amount_due,
                  currency: nextInvoice.currency,
                  next_payment_attempt: nextInvoice.next_payment_attempt,
                  status: nextInvoice.status,
                  hosted_invoice_url: nextInvoice.hosted_invoice_url ?? null,
                  invoice_pdf: nextInvoice.invoice_pdf ?? null,
              }
            : null,
        last_payment: lastPayment
            ? {
                  amount_paid: lastPayment.amount_paid,
                  currency: lastPayment.currency,
                  paid_at: lastPayment.status_transitions?.paid_at ?? null,
                  hosted_invoice_url: lastPayment.hosted_invoice_url ?? null,
                  invoice_pdf: lastPayment.invoice_pdf ?? null,
                  status: lastPayment.status,
              }
            : null,
    })
}
