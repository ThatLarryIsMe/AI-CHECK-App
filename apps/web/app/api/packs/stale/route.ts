import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { pool } from "@/lib/db";
import { analyzePackDecay } from "@/lib/decay";
import type { EvidencePack } from "@proofmode/core";

/**
 * GET /api/packs/stale
 *
 * Returns the user's packs that have stale or expired claims.
 * Used by the account page and verify page to show re-verification alerts.
 *
 * Query params:
 *   ?threshold=50  — freshness threshold (default 50)
 *   ?limit=10      — max packs to return (default 10)
 */
export async function GET(request: NextRequest) {
  const sessionUser = await getUserFromRequest(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const threshold = parseInt(
    request.nextUrl.searchParams.get("threshold") ?? "50",
    10
  );
  const limit = Math.min(
    50,
    parseInt(request.nextUrl.searchParams.get("limit") ?? "10", 10)
  );

  // Fetch user's recent packs
  const { rows } = await pool.query<{
    pack_id: string;
    pack_json: EvidencePack;
    created_at: string;
  }>(
    `SELECT p.id AS pack_id, p.pack_json, p.created_at
     FROM packs p
     JOIN jobs j ON j.id = p.job_id
     WHERE j.user_id = $1
     ORDER BY p.created_at DESC
     LIMIT $2`,
    [sessionUser.userId, limit * 3] // over-fetch since we filter
  );

  const stalePacks = [];

  for (const row of rows) {
    const pack = row.pack_json;
    if (!pack?.claims?.length) continue;

    const decay = analyzePackDecay(pack.claims, row.created_at);

    if (decay.packFreshness < threshold) {
      stalePacks.push({
        packId: row.pack_id,
        verifiedAt: row.created_at,
        totalClaims: pack.claims.length,
        packFreshness: decay.packFreshness,
        staleClaims: decay.staleClaims,
        expiredClaims: decay.expiredClaims,
        snippet: pack.claims[0]?.text?.slice(0, 80) ?? "",
      });

      if (stalePacks.length >= limit) break;
    }
  }

  return NextResponse.json({
    stalePacks,
    total: stalePacks.length,
    threshold,
  });
}
