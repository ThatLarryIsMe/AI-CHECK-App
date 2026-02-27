import { NextResponse } from "next/server";
import { getPack } from "@/lib/jobs";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const pack = getPack(params.id);

  if (!pack) {
    return NextResponse.json({ error: "Pack not found" }, { status: 404 });
  }

  return NextResponse.json(pack);
}
