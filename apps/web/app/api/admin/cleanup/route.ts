import { NextRequest, NextResponse } from "next/server";
import { requireBetaKey } from "@/lib/access";
import { pool } from "@/lib/db";

// H4/H5: Admin endpoint to purge expired sessions and old rate limit rows
export async function POST(request: NextRequest) {
  const access = requireBetaKey(request);
  if (!access.ok) {
    return NextResponse.json(
      { error: "Unauthorized. Valid x-proofmode-key header required." },
      { status: 401 }
    );
  }

  try {
    const sessions = await pool.query(
      `DELETE FROM sessions WHERE expires_at < NOW()`
    );
    const rateLimits = await pool.query(
      `DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '48 hours'`
    );
    const userRateLimits = await pool.query(
      `DELETE FROM user_rate_limits WHERE created_at < NOW() - INTERVAL '48 hours'`
    );
    const loginAttempts = await pool.query(
      `DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '1 hour'`
    );
    const stripeEvents = await pool.query(
      `DELETE FROM stripe_events WHERE processed_at < NOW() - INTERVAL '7 days'`
    );

    return NextResponse.json({
      cleaned: {
        expiredSessions: sessions.rowCount ?? 0,
        oldRateLimits: rateLimits.rowCount ?? 0,
        oldUserRateLimits: userRateLimits.rowCount ?? 0,
        oldLoginAttempts: loginAttempts.rowCount ?? 0,
        oldStripeEvents: stripeEvents.rowCount ?? 0,
      },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "admin_cleanup_failed",
        error: error instanceof Error ? error.message : String(error),
      })
    );
    return NextResponse.json(
      { error: "Cleanup failed." },
      { status: 500 }
    );
  }
}
