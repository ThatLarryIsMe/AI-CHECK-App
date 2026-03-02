import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { VERSION } from "@/../../version";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    await pool.query("SELECT 1");
    return NextResponse.json({
      status: "ok",
      version: VERSION,
      db: "connected",
      latencyMs: Date.now() - start,
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        version: VERSION,
        db: "unreachable",
        latencyMs: Date.now() - start,
      },
      { status: 503 }
    );
  }
}
