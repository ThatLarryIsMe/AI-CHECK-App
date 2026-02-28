import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { stripe, getPlanFromSubscription, mapSubscriptionStatus } from "@/lib/stripe"
import { pool } from "@/lib/db"

// Phase P3.1: Stripe webhook handler
// Must use raw body for signature verification
export const runtime = "nodejs"

async function upsertSubscription(subscription: Stripe.Subscription) {
    const customerId =
          typeof subscription.customer === "string"
        ? subscription.customer
            : subscription.customer.id
    const plan = getPlanFromSubscription(subscription)
    const planStatus = mapSubscriptionStatus(subscription.status)
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000)
    await pool.query(
          `UPDATE users
               SET stripe_subscription_id = $1,
                        plan                   = $2,
                                 plan_status            = $3,
                                          current_period_end     = $4
                                               WHERE stripe_customer_id   = $5`,
          [subscription.id, plan, planStatus, currentPeriodEnd.toISOString(), customerId]
        )
}

export async function POST(request: NextRequest) {
    const sig = request.headers.get("stripe-signature")
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!sig || !webhookSecret) {
          return NextResponse.json({ error: "Missing signature." }, { status: 400 })
    }
    let event: Stripe.Event
    try {
          const rawBody = await request.text()
          event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown"
          console.error(JSON.stringify({ level: "error", event: "stripe_webhook_sig_failed", error: msg }))
          return NextResponse.json({ error: `Signature failed: ${msg}` }, { status: 400 })
    }
    try {
          switch (event.type) {
            case "checkout.session.completed": {
                      const session = event.data.object as Stripe.Checkout.Session
                      if (session.mode === "subscription" && session.subscription) {
                                  const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id
                                  const subscription = await stripe.subscriptions.retrieve(subId)
                                  await upsertSubscription(subscription)
                      }
                      break
            }
            case "customer.subscription.created":
            case "customer.subscription.updated": {
                      await upsertSubscription(event.data.object as Stripe.Subscription)
                      break
            }
            case "customer.subscription.deleted": {
                      const sub = event.data.object as Stripe.Subscription
                      const cid = typeof sub.customer === "string" ? sub.customer : sub.customer.id
                      await pool.query(
                                  `UPDATE users SET plan = 'free', plan_status = 'canceled', stripe_subscription_id = NULL, current_period_end = NULL WHERE stripe_customer_id = $1`,
                                  [cid]
                                )
                      break
            }
            default:
                      break
          }
          console.log(JSON.stringify({ level: "info", event: "stripe_webhook_processed", type: event.type, id: event.id }))
    } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown"
          console.error(JSON.stringify({ level: "error", event: "stripe_webhook_handler_failed", type: event.type, error: msg }))
          // Always return 200 unless signature invalid
    }
    return NextResponse.json({ received: true })
}
