import { NextRequest, NextResponse } from "next/server";
import { requireBetaKey } from "@/lib/access";
import { pool } from "@/lib/db";
import { VERSION } from "@/../../version";

export async function GET(request: NextRequest) {
  // Require BETA_ACCESS_KEY header
  const access = requireBetaKey(request);
  if (!access.ok) {
    return NextResponse.json(
      { error: "Unauthorized. Valid x-proofmode-key header required." },
      { status: 401 }
    );
  }

  try {
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);

    // M8: All aggregates are now scoped to today (UTC) to avoid dilution by historical data
    const result = await pool.query<{
      total_jobs_today: string;
      avg_duration_ms: string | null;
      timeout_count: string;
      retrieval_count: string;
    }>(
      `SELECT
        COUNT(*) AS total_jobs_today,
        AVG(duration_ms) AS avg_duration_ms,
        COUNT(*) FILTER (WHERE llm_timeout = TRUE) AS timeout_count,
        COUNT(*) FILTER (WHERE retrieval_used = TRUE) AS retrieval_count
      FROM job_metrics
      WHERE created_at >= $1`,
      [todayUtc.toISOString()]
    );

    const row = result.rows[0];
    const totalJobsToday = parseInt(row.total_jobs_today ?? "0", 10);

    const avgDurationMs =
      row.avg_duration_ms != null
        ? Math.round(parseFloat(row.avg_duration_ms))
        : 0;
    const timeoutCount = parseInt(row.timeout_count ?? "0", 10);
    const retrievalCount = parseInt(row.retrieval_count ?? "0", 10);

    const timeoutRate =
      totalJobsToday > 0
        ? Math.round((timeoutCount / totalJobsToday) * 100 * 100) / 100
        : 0;
    const retrievalRate =
      totalJobsToday > 0
        ? Math.round((retrievalCount / totalJobsToday) * 100 * 100) / 100
        : 0;

    // Phase P1: count rate-limited attempts today
    const rateLimitResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM rate_limits WHERE created_at >= $1`,
      [todayUtc.toISOString()]
    );
    const rateLimitedToday = parseInt(
      rateLimitResult.rows[0]?.count ?? "0",
      10
    );

    return NextResponse.json({
      version: VERSION,
      totalJobsToday,
      avgDurationMs,
      timeoutRate,
      retrievalRate,
      rateLimitedToday,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "admin_health_query_failed",
        error: error instanceof Error ? error.message : String(error),
      })
    );
    return NextResponse.json(
      { error: "Failed to query health metrics." },
      { status: 500 }
    );
  }
}
