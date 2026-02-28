import { NextRequest, NextResponse } from "next/server";
import { getPackForUser } from "@/lib/jobs-db";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // P2.2: require session
  const sessionUser = await getUserFromRequest(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // P2.2: ownership-aware fetch — returns null if pack not found or belongs to different user
  const pack = await getPackForUser(params.id, sessionUser.userId);
  if (!pack) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(pack);
}
