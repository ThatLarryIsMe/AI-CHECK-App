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
import { extractTextFromUrl } from "@/lib/url-extractor";
import { extractTextFromPdf } from "@/lib/pdf-extractor";

// Allow up to 120s for URL/PDF fetch + LLM + retrieval on Vercel
export const maxDuration = 120;

// Daily cost-control limits
const DAILY_IP_LIMIT = 25;
const DAILY_GLOBAL_LIMIT = 500;
const ANONYMOUS_TRIAL_LIMIT = 1; // 1 free check without signup

async function checkDailyLimits(
  _ip: string,
  _isPro: boolean
): Promise<{ limited: true; message: string } | { limited: false }> {
  const since = new Date();
  since.setUTCHours(since.getUTCHours() - 24);

  // Global daily limit (IP limits are now handled atomically below)
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

// H1: Atomic rate limit — check + insert in a single query to prevent race conditions.
// Returns null if rate limit row was inserted (under limit), or an error message if at limit.
async function atomicUserRateLimit(
    userId: string
  ): Promise<{ limited: true; message: string } | { limited: false; isPro: boolean }> {
    const since = new Date();
    since.setUTCHours(since.getUTCHours() - 24);

    // Fetch plan and role info for this user
    const planResult = await pool.query<{ plan: string; plan_status: string; role: string }>(
          `SELECT plan, plan_status, role FROM users WHERE id = $1`,
          [userId]
        );
    const plan = planResult.rows[0]?.plan ?? "free";
    const planStatus = planResult.rows[0]?.plan_status ?? "inactive";
    const role = planResult.rows[0]?.role ?? "user";

    // Fetch invite bonus checks separately (column may not exist yet)
    let inviteChecks = 0;
    try {
      const inviteResult = await pool.query<{ invite_checks_remaining: number }>(
        `SELECT invite_checks_remaining FROM users WHERE id = $1`,
        [userId]
      );
      inviteChecks = inviteResult.rows[0]?.invite_checks_remaining ?? 0;
    } catch {
      // Column doesn't exist yet — skip bonus checks
    }
    const isPro = planStatus === "active" && plan === "pro";
    const isAdmin = role === "admin";

    // Admins get unlimited checks; Pro gets 200; Free gets 2
    if (isAdmin) {
      // Still record rate limit row for metrics, but never block
      await pool.query(`INSERT INTO user_rate_limits (user_id) VALUES ($1)`, [userId]);
      return { limited: false, isPro: true };
    }

    // Invite bonus checks: if user has remaining bonus checks, consume one (bypasses daily limit)
    if (inviteChecks > 0) {
      const decremented = await pool.query<{ invite_checks_remaining: number }>(
        `UPDATE users SET invite_checks_remaining = invite_checks_remaining - 1
         WHERE id = $1 AND invite_checks_remaining > 0
         RETURNING invite_checks_remaining`,
        [userId]
      );
      if (decremented.rows.length > 0) {
        await pool.query(`INSERT INTO user_rate_limits (user_id) VALUES ($1)`, [userId]);
        return { limited: false, isPro };
      }
    }

    const limit = isPro ? 200 : 2;

    // Atomic: INSERT only if count is below the limit
    const result = await pool.query<{ id: number }>(
          `INSERT INTO user_rate_limits (user_id)
           SELECT $1
           WHERE (SELECT COUNT(*) FROM user_rate_limits WHERE user_id = $1 AND created_at >= $2) < $3
           RETURNING id`,
          [userId, since.toISOString(), limit]
        );
    if (result.rows.length === 0) {
          return { limited: true, message: "Daily user limit reached." };
    }
    return { limited: false, isPro };
}

// Anonymous trial: 1 free check per IP per day (no signup required)
async function atomicAnonymousTrialLimit(
  ip: string
): Promise<{ limited: true; message: string } | { limited: false }> {
  const since = new Date();
  since.setUTCHours(since.getUTCHours() - 24);
  const result = await pool.query<{ id: number }>(
    `INSERT INTO rate_limits (ip)
     SELECT $1
     WHERE (SELECT COUNT(*) FROM rate_limits WHERE ip = $1 AND created_at >= $2) < $3
     RETURNING id`,
    [ip, since.toISOString(), ANONYMOUS_TRIAL_LIMIT]
  );
  if (result.rows.length === 0) {
    return {
      limited: true,
      message: "You've used your free trial check. Sign up free for 2 checks per day!",
    };
  }
  return { limited: false };
}

// Atomic IP rate limit insert — only inserts if under the daily IP limit
async function atomicIpRateLimit(ip: string): Promise<boolean> {
    const since = new Date();
    since.setUTCHours(since.getUTCHours() - 24);
    const result = await pool.query<{ id: number }>(
          `INSERT INTO rate_limits (ip)
           SELECT $1
           WHERE (SELECT COUNT(*) FROM rate_limits WHERE ip = $1 AND created_at >= $2) < $3
           RETURNING id`,
          [ip, since.toISOString(), DAILY_IP_LIMIT]
        );
    return result.rows.length === 0; // true = limited
}

export async function POST(request: NextRequest) {
  const sessionUser = await getUserFromRequest(request);

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  // Parse input — supports JSON { text } or { url }, or FormData with a PDF file
  let text = "";
  let sourceType: "text" | "url" | "pdf" = "text";
  let sourceRef = "";

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    // PDF file upload via FormData
    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "A PDF file is required" }, { status: 400 });
    }
    if (file.size > 10_000_000) {
      return NextResponse.json({ error: "PDF must be under 10 MB" }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    try {
      text = await extractTextFromPdf(Buffer.from(arrayBuffer));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to extract text from PDF";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    sourceType = "pdf";
    sourceRef = file instanceof File ? file.name : "upload.pdf";
  } else {
    // JSON body — either { text } or { url }
    const body = await request.json().catch(() => null);
    const rawText = typeof body?.text === "string" ? body.text.trim() : "";
    const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";

    if (rawUrl) {
      try {
        text = await extractTextFromUrl(rawUrl);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to fetch URL";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      sourceType = "url";
      sourceRef = rawUrl;
    } else if (rawText) {
      text = rawText;
    } else {
      return NextResponse.json({ error: "text, url, or a PDF file is required" }, { status: 400 });
    }
  }

  // Truncate extracted text to engine max (10k chars)
  if (text.length > 10_000) {
    text = text.slice(0, 10_000);
  }

  // Rate limiting — anonymous vs authenticated
  let isPro = false;
  const userId = sessionUser?.userId ?? null;

  if (!sessionUser) {
    // Anonymous trial: 1 free check per IP per day
    const trialCheck = await atomicAnonymousTrialLimit(ip);
    if (trialCheck.limited) {
      return NextResponse.json(
        { error: trialCheck.message, needsSignup: true },
        { status: 429 }
      );
    }
  } else {
    // Authenticated: per-user daily cap
    const userCapCheck = await atomicUserRateLimit(sessionUser.userId);
    if (userCapCheck.limited) {
      console.warn(
        JSON.stringify({
          level: "warn",
          event: "user_rate_limited",
          userId,
          ip,
          timestamp: new Date().toISOString(),
        })
      );
      return NextResponse.json({ error: userCapCheck.message }, { status: 429 });
    }
    isPro = userCapCheck.isPro;

    // IP rate limit (Pro users exempt)
    if (!isPro) {
      const ipLimited = await atomicIpRateLimit(ip);
      if (ipLimited) {
        return NextResponse.json(
          { error: "Daily per-IP limit reached." },
          { status: 429 }
        );
      }
    } else {
      await pool.query(`INSERT INTO rate_limits (ip) VALUES ($1)`, [ip]);
    }
  }

  // Daily cost-control: global limit check
  const dailyCheck = await checkDailyLimits(ip, isPro);
  if (dailyCheck.limited) {
    console.error(
      JSON.stringify({
        level: "warn",
        event: "rate_limited",
        ip,
        userId,
        reason: dailyCheck.message,
        timestamp: new Date().toISOString(),
      })
    );
    return NextResponse.json({ error: dailyCheck.message }, { status: 429 });
  }

  const job = await createJob(text, userId ?? undefined);
  const jobId = job.id;

  // Process verification synchronously — serverless-safe (C2 fix)
  const startTime = Date.now();
  let telemetry: VerificationTelemetry | null = null;
  await markProcessing(jobId);
  try {
    const pack = await runVerification(text, jobId, {
      isPro,
      onTelemetry: (payload) => {
        telemetry = payload;
      },
    });
    const { savePack } = await import("@/lib/jobs-db");
    const packId = await savePack(jobId, pack.engineVersion ?? "1.0.0-lite", pack);
    await markComplete(jobId, packId);
    const tel = telemetry as VerificationTelemetry | null;
    const durationMs = tel?.totalDurationMs ?? Date.now() - startTime;
    const retrievalUsed = (tel?.evidenceCount ?? 0) > 0;
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
        userId,
        totalDurationMs: durationMs,
        llmDurationMs: tel?.llmDurationMs ?? null,
        retrievalDurationMs: tel?.retrievalDurationMs ?? null,
        claimsCount: tel?.claimsCount ?? pack.claims.length,
        evidenceCount: tel?.evidenceCount ?? pack.evidence.length,
        engineVersion: tel?.engineVersion ?? pack.engineVersion,
        inputLength: text.length,
        errorType: null,
      })
    );

    return NextResponse.json({ jobId, packId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown verify failure";
    const errorType = (error as { type?: string })?.type ?? "UNKNOWN_ERROR";
    const llmTimedOut =
      message.toLowerCase().includes("timeout") || errorType === "LLM_TIMEOUT";
    const tel = telemetry as VerificationTelemetry | null;
    const durationMs = tel?.totalDurationMs ?? Date.now() - startTime;
    const retrievalUsed = (tel?.evidenceCount ?? 0) > 0;
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
        userId,
        totalDurationMs: durationMs,
        llmDurationMs: tel?.llmDurationMs ?? null,
        retrievalDurationMs: tel?.retrievalDurationMs ?? null,
        claimsCount: tel?.claimsCount ?? 0,
        evidenceCount: tel?.evidenceCount ?? 0,
        engineVersion:
          tel?.engineVersion ??
          process.env.ENGINE_VERSION ??
          "1.0.0-lite",
        inputLength: text.length,
        errorType,
        error: message,
      })
    );

    return NextResponse.json({ jobId, error: message }, { status: 500 });
  }
}
