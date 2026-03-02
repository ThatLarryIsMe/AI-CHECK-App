import Stripe from "stripe"

// Lazy-initialised Stripe client — avoids crashing `next build` when
// env vars are only available at runtime (e.g. Docker / CI).
let _stripe: Stripe | undefined

export function getStripe(): Stripe {
    if (_stripe) return _stripe

    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
        throw new Error("STRIPE_SECRET_KEY environment variable is not set")
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.warn(
            JSON.stringify({ level: "warn", event: "missing_env", var: "STRIPE_WEBHOOK_SECRET" })
        )
    }
    if (!process.env.STRIPE_PRICE_ID_PRO) {
        console.warn(
            JSON.stringify({ level: "warn", event: "missing_env", var: "STRIPE_PRICE_ID_PRO" })
        )
    }
    if (!process.env.NEXT_PUBLIC_APP_URL) {
        console.warn(
            JSON.stringify({ level: "warn", event: "missing_env", var: "NEXT_PUBLIC_APP_URL" })
        )
    }

    _stripe = new Stripe(key, { apiVersion: "2026-02-25.clover" })
    return _stripe
}

/** @deprecated Use getStripe() — kept for backward compat during migration */
export const stripe = new Proxy({} as Stripe, {
    get(_target, prop, receiver) {
        return Reflect.get(getStripe(), prop, receiver)
    },
})

// ---------------------------------------------------------------------------
// Plan helpers
// ---------------------------------------------------------------------------

export type PlanName = "free" | "pro"
export type PlanStatus = "inactive" | "active" | "past_due" | "canceled"

export interface UserPlan {
    plan: PlanName
    planStatus: PlanStatus
    currentPeriodEnd: Date | null
}

/**
 * Derive plan name from a Stripe subscription object.
 * Extend the price-id matching as more plans are added.
 */
export function getPlanFromSubscription(
    subscription: Stripe.Subscription
  ): PlanName {
    const priceId = subscription.items.data[0]?.price?.id ?? ""
    if (priceId === process.env.STRIPE_PRICE_ID_PRO) return "pro"
    return "free"
}

/**
 * Map a Stripe subscription status to our internal plan_status.
 */
export function mapSubscriptionStatus(
    status: Stripe.Subscription.Status
  ): PlanStatus {
    switch (status) {
      case "active":
              return "active"
      case "past_due":
              return "past_due"
      case "canceled":
      case "unpaid":
      case "incomplete_expired":
              return "canceled"
      default:
              return "inactive"
    }
}
