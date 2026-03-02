import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { stripe } from "@/lib/stripe"
import { pool } from "@/lib/db"

export async function POST(request: NextRequest) {
    const sessionUser = await getUserFromRequest(request)
    if (!sessionUser) {
          return NextResponse.json(
            { error: "Authentication required." },
            { status: 401 }
                )
    }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""

  // Fetch or create Stripe customer
  const userResult = await pool.query<{
        stripe_customer_id: string | null
        email: string
        plan: string
        plan_status: string
  }>(
        `SELECT stripe_customer_id, email, plan, plan_status FROM users WHERE id = $1`,
        [sessionUser.userId]
      )
    const user = userResult.rows[0]
    if (!user) {
          return NextResponse.json({ error: "User not found." }, { status: 404 })
    }

  // H6: Prevent duplicate subscriptions — already-Pro users can't checkout again
  if (user.plan === "pro" && user.plan_status === "active") {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
        return NextResponse.redirect(`${appUrl}/account`, 303)
  }

  let customerId = user.stripe_customer_id
    if (!customerId) {
          const customer = await stripe.customers.create({
                  email: user.email,
                  metadata: { userId: sessionUser.userId },
          })
          customerId = customer.id
          await pool.query(
                  `UPDATE users SET stripe_customer_id = $1 WHERE id = $2`,
                  [customerId, sessionUser.userId]
                )
    }

  const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [
          {
                    price: process.env.STRIPE_PRICE_ID_PRO!,
                    quantity: 1,
          },
              ],
        success_url: `${appUrl}/account?success=1`,
        cancel_url: `${appUrl}/account?canceled=1`,
        subscription_data: {
                metadata: { userId: sessionUser.userId },
        },
  })

  return NextResponse.redirect(checkoutSession.url!, 303)
}
