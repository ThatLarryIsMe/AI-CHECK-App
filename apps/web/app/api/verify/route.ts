import { NextRequest, NextResponse } from "next/server";
import { runVerification } from "@/lib/engine";
import { createJob, savePack, updateJob } from "@/lib/jobs";

// In-memory rate limiter: max 10 requests per IP per 60 seconds
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

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

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "rate_limit_exceeded",
        ip,
        timestamp: new Date().toISOString(),
      })
    );
    return NextResponse.json(
      { error: "Rate limit exceeded. Maximum 10 requests per minute." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const jobId = crypto.randomUUID();
  createJob(jobId);

  void (async () => {
    const startTime = Date.now();
    updateJob(jobId, { status: "running" });
    try {
      const pack = await runVerification(text, jobId);
      savePack(pack);
      updateJob(jobId, { status: "completed", packId: pack.id });
      console.log(
        JSON.stringify({
          level: "info",
          event: "job_completed",
          jobId,
          packId: pack.id,
          durationMs: Date.now() - startTime,
        })
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown verify failure";
      const errorType =
        (error as { type?: string })?.type ?? "UNKNOWN_ERROR";
      updateJob(jobId, { status: "failed", error: message });
      console.error(
        JSON.stringify({
          level: "error",
          event: "job_failed",
          jobId,
          errorType,
          error: message,
          durationMs: Date.now() - startTime,
        })
      );
    }
  })();

  return NextResponse.json({ jobId });
}
