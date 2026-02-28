import { NextRequest, NextResponse } from "next/server";
import { runVerification, type VerificationTelemetry } from "@/lib/engine";
import {
  createJob,
  markProcessing,
  markComplete,
  markFailed,
} from "@/lib/jobs-db";
import { requireBetaKey } from "@/lib/access";

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
  const betaAccess = requireBetaKey(request);
  if (!betaAccess.ok) {
    return NextResponse.json(
      { error: "Invite-only beta. Invalid or missing access key." },
      { status: 403 }
    );
  }

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

  const job = await createJob(text);
  const jobId = job.id;

  void (async () => {
    const startTime = Date.now();
    let telemetry: VerificationTelemetry | null = null;

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

      console.log(
        JSON.stringify({
          level: "info",
          event: "job_completed",
          jobId,
          totalDurationMs: telemetry?.totalDurationMs ?? Date.now() - startTime,
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
      const message =
        error instanceof Error ? error.message : "Unknown verify failure";
      const errorType = (error as { type?: string })?.type ?? "UNKNOWN_ERROR";
      await markFailed(jobId, message);
      console.error(
        JSON.stringify({
          level: "error",
          event: "job_failed",
          jobId,
          totalDurationMs: telemetry?.totalDurationMs ?? Date.now() - startTime,
          llmDurationMs: telemetry?.llmDurationMs ?? null,
          retrievalDurationMs: telemetry?.retrievalDurationMs ?? null,
          claimsCount: telemetry?.claimsCount ?? 0,
          evidenceCount: telemetry?.evidenceCount ?? 0,
          engineVersion: telemetry?.engineVersion ?? process.env.ENGINE_VERSION ?? "1.0.0-lite",
          inputLength: text.length,
          errorType,
          error: message,
        })
      );
    }
  })();

  return NextResponse.json({ jobId });
}
