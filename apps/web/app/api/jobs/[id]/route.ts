import { NextResponse } from "next/server";
import { getJob } from "@/lib/jobs-db";

export async function GET(
  _: Request,
  { params }: { params: { id: string } }
) {
  const job = await getJob(params.id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json({ status: job.status, packId: job.packId });
}
