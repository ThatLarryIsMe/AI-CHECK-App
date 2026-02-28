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

  const userResult = await pool.query<{ stripe_customer_id: string | null }>(
        `SELECT stripe_customer_id FROM users WHERE id = $1`,
        [sessionUser.userId]
      )
    const customerId = userResult.rows[0]?.stripe_customer_id
    if (!customerId) {
          return NextResponse.json(
            { error: "No billing account found. Please subscribe first." },
            { status: 400 }
                )
    }

  const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${appUrl}/account`,
  })

  return NextResponse.json({ url: portalSession.url })
}
