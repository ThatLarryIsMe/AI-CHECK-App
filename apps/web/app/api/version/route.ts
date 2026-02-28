import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    version: process.env.ENGINE_VERSION ?? "1.0.0-lite",
    engine: "proofmode",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    timestamp: new Date().toISOString(),
  });
}
