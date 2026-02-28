import { NextRequest, NextResponse } from "next/server";
import { runVerification, type VerificationTelemetry } from "@/lib/engine";
import {
  createJob,
  markProcessing,
  markComplete,
  markFailed,
  insertJobMetrics,
} from "@/lib/jobs-db";
import { getUserFromRequest } from "@/lib/auth";
import { pool } from "@/lib/db";

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

// Phase P1: Daily cost-control limits
const DAILY_IP_LIMIT = 25;
const DAILY_GLOBAL_LIMIT = 500;

// Phase P2.2: Per-user daily cap
// Phase P3.1: Per-user daily cap is now plan-aware (free=10, pro=200)

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }
  entry.count += 1;
  return false;
}

async function checkDailyLimits(
  ip: string
): Promise<{ limited: true; message: string } | { limited: false }> {
  const since = new Date();
  since.setUTCHours(since.getUTCHours() - 24);

  const ipResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM rate_limits WHERE ip = $1 AND created_at >= $2`,
    [ip, since.toISOString()]
  );
  const ipCount = parseInt(ipResult.rows[0]?.count ?? "0", 10);
  if (ipCount >= DAILY_IP_LIMIT) {
    return { limited: true, message: "Daily per-IP limit reached." };
  }

  const globalResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM rate_limits WHERE created_at >= $1`,
    [since.toISOString()]
  );
  const globalCount = parseInt(globalResult.rows[0]?.count ?? "0", 10);
  if (globalCount >= DAILY_GLOBAL_LIMIT) {
    return {
      limited: true,
      message: "Daily system capacity reached. Try tomorrow.",
    };
  }

  return { limited: false };
}

// Phase P3.1: per-user daily cap check — plan-aware
async function checkUserDailyLimit(
    userId: string
  ): Promise<{ limited: true; message: string } | { limited: false }> {
    const since = new Date();
    since.setUTCHours(since.getUTCHours() - 24);

    // Fetch plan info for this user
    const planResult = await pool.query<{ plan: string; plan_status: string }>(
          `SELECT plan, plan_status FROM users WHERE id = $1`,
          [userId]
        );
    const plan = planResult.rows[0]?.plan ?? "free";
    const planStatus = planResult.rows[0]?.plan_status ?? "inactive";

    // Phase P3.1: pro=200/day, free=10/day
    const limit =
          planStatus === "active" && plan === "pro" ? 200 : 10;

    const result = await pool.query<{ count: string }>(
          `SELECT COUNT(*) AS count FROM user_rate_limits WHERE user_id = $1 AND created_at >= $2`,
          [userId, since.toISOString()]
        );
    const count = parseInt(result.rows[0]?.count ?? "0", 10);
    if (count >= limit) {
          return { limited: true, message: "Daily user limit reached." };
    }
    return { limited: false };
}

export async function POST(request: NextRequest) {
  // Phase P2.1: Require authenticated session
  const sessionUser = await getUserFromRequest(request);
  if (!sessionUser) {
    return NextResponse.json(
      { error: "Authentication required. Please sign in." },
      { status: 401 }
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "rate_limit_exceeded",
        ip,
        userId: sessionUser.userId,
        timestamp: new Date().toISOString(),
      })
    );
    return NextResponse.json(
      { error: "Rate limit exceeded. Maximum 10 requests per minute." },
      { status: 429 }
    );
  }

  // Phase P1: daily cost-control check
  const dailyCheck = await checkDailyLimits(ip);
  if (dailyCheck.limited) {
    console.error(
      JSON.stringify({
        level: "warn",
        event: "rate_limited",
        ip,
        userId: sessionUser.userId,
        reason: dailyCheck.message,
        timestamp: new Date().toISOString(),
      })
    );
    return NextResponse.json({ error: dailyCheck.message }, { status: 429 });
  }

  // Phase P2.2: per-user daily cap
  const userCapCheck = await checkUserDailyLimit(sessionUser.userId);
  if (userCapCheck.limited) {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "user_rate_limited",
        userId: sessionUser.userId,
        ip,
        timestamp: new Date().toISOString(),
      })
    );
    return NextResponse.json({ error: userCapCheck.message }, { status: 429 });
  }

  // Record this attempt in rate_limits (IP)
  await pool.query(`INSERT INTO rate_limits (ip) VALUES ($1)`, [ip]);
  // Record this attempt in user_rate_limits (per-user)
  await pool.query(`INSERT INTO user_rate_limits (user_id) VALUES ($1)`, [
    sessionUser.userId,
  ]);

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  // Phase P2.1: pass userId so jobs.user_id is populated
  const job = await createJob(text, sessionUser.userId);
  const jobId = job.id;

  void (async () => {
    const startTime = Date.now();
    let telemetry: VerificationTelemetry | null = null;
    let llmTimedOut = false;
    await markProcessing(jobId);
    try {
      const pack = await runVerification(text, jobId, {
        onTelemetry: (payload) => {
          telemetry = payload;
        },
      });
      const { savePack } = await import("@/lib/jobs-db");
      const packId = await savePack(jobId, pack.engineVersion ?? "1.0.0-lite", pack);
      await markComplete(jobId, packId);
      const durationMs = telemetry?.totalDurationMs ?? Date.now() - startTime;
      const retrievalUsed = (telemetry?.evidenceCount ?? 0) > 0;
      try {
        await insertJobMetrics({ jobId, durationMs, llmTimeout: false, retrievalUsed });
      } catch (metricsErr) {
        console.error(
          JSON.stringify({
            level: "error",
            event: "job_metrics_insert_failed",
            jobId,
            error: metricsErr instanceof Error ? metricsErr.message : String(metricsErr),
          })
        );
      }
      console.log(
        JSON.stringify({
          level: "info",
          event: "job_completed",
          jobId,
          userId: sessionUser.userId,
          totalDurationMs: durationMs,
          llmDurationMs: telemetry?.llmDurationMs ?? null,
          retrievalDurationMs: telemetry?.retrievalDurationMs ?? null,
          claimsCount: telemetry?.claimsCount ?? pack.claims.length,
          evidenceCount: telemetry?.evidenceCount ?? pack.evidence.length,
          engineVersion: telemetry?.engineVersion ?? pack.engineVersion,
          inputLength: text.length,
          errorType: null,
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown verify failure";
      const errorType = (error as { type?: string })?.type ?? "UNKNOWN_ERROR";
      llmTimedOut =
        message.toLowerCase().includes("timeout") || errorType === "LLM_TIMEOUT";
      const durationMs = telemetry?.totalDurationMs ?? Date.now() - startTime;
      const retrievalUsed = (telemetry?.evidenceCount ?? 0) > 0;
      await markFailed(jobId, message);
      try {
        await insertJobMetrics({ jobId, durationMs, llmTimeout: llmTimedOut, retrievalUsed });
      } catch (metricsErr) {
        console.error(
          JSON.stringify({
            level: "error",
            event: "job_metrics_insert_failed",
            jobId,
            error: metricsErr instanceof Error ? metricsErr.message : String(metricsErr),
          })
        );
      }
      console.error(
        JSON.stringify({
          level: "error",
          event: "job_failed",
          jobId,
          userId: sessionUser.userId,
          totalDurationMs: durationMs,
          llmDurationMs: telemetry?.llmDurationMs ?? null,
          retrievalDurationMs: telemetry?.retrievalDurationMs ?? null,
          claimsCount: telemetry?.claimsCount ?? 0,
          evidenceCount: telemetry?.evidenceCount ?? 0,
          engineVersion:
            telemetry?.engineVersion ??
            process.env.ENGINE_VERSION ??
            "1.0.0-lite",
          inputLength: text.length,
          errorType,
          error: message,
        })
      );
    }
  })();

  return NextResponse.json({ jobId });
}
