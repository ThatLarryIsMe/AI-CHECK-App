import { NextResponse } from "next/server";
import { runVerification } from "@/lib/engine";
import { createJob, savePack, updateJob } from "@/lib/jobs";

export async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!text) {
        return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const jobId = crypto.randomUUID();
    createJob(jobId);

  void (async () => {
        updateJob(jobId, { status: "running" });
          try {
                  const pack = await runVerification(text, jobId);
                  savePack(pack);
                  updateJob(jobId, { status: "completed", packId: pack.id });
          } catch (error) {
                  const message =
                            error instanceof Error ? error.message : "Unknown verify failure";
                  updateJob(jobId, { status: "failed", error: message });
          }
  })();

  return NextResponse.json({ jobId });
  }
