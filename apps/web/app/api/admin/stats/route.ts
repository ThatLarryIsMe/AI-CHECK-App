import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireBetaKey } from "@/lib/access";

export async function GET(request: NextRequest) {
  const betaAccess = requireBetaKey(request);
  if (!betaAccess.ok) {
    return NextResponse.json(
      { error: "Invite-only beta. Invalid or missing access key." },
      { status: 403 }
    );
  }

  try {
    const [jobsResult, packsResult, waitlistResult, jobs24hResult, avgClaimsResult] =
      await Promise.all([
        query<{ count: string }>("SELECT COUNT(*)::text AS count FROM jobs"),
        query<{ count: string }>("SELECT COUNT(*)::text AS count FROM packs"),
        query<{ count: string }>("SELECT COUNT(*)::text AS count FROM waitlist_signups"),
        query<{ count: string }>(
          "SELECT COUNT(*)::text AS count FROM jobs WHERE created_at >= NOW() - INTERVAL '24 hours'"
        ),
        query<{ avg_claims: string | null }>(
          `SELECT AVG(jsonb_array_length(COALESCE(pack_json->'claims', '[]'::jsonb)))::text AS avg_claims
           FROM packs`
        ),
      ]);

    return NextResponse.json({
      total_jobs: Number.parseInt(jobsResult[0]?.count ?? "0", 10),
      total_packs: Number.parseInt(packsResult[0]?.count ?? "0", 10),
      total_waitlist_signups: Number.parseInt(waitlistResult[0]?.count ?? "0", 10),
      last_24h_jobs: Number.parseInt(jobs24hResult[0]?.count ?? "0", 10),
      avg_claims_per_pack: Number.parseFloat(avgClaimsResult[0]?.avg_claims ?? "0"),
    });
  } catch (error) {
    console.error("admin stats GET error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
