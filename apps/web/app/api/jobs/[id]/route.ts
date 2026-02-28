import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobs-db";
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

  const job = await getJob(params.id);

  // P2.2: ownership check — return 404 to avoid leaking existence
  if (!job || job.userId !== sessionUser.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ status: job.status, packId: job.packId });
}
