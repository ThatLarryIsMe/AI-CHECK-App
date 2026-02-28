import Stripe from "stripe"

// Phase P3.1: Stripe server-side singleton
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2023-10-16",
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
