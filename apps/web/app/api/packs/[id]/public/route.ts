import { NextRequest, NextResponse } from "next/server";
import { getPack } from "@/lib/jobs-db";

/**
 * GET /api/packs/[id]/public
 * Public endpoint — no auth required.
 * Pack UUIDs are effectively unguessable, so "anyone with the link can view".
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const pack = await getPack(params.id);
  if (!pack) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(pack, {
    headers: {
      // Cache public packs for 5 minutes
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
