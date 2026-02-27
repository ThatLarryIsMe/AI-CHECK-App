import { NextRequest, NextResponse } from "next/server";

// In-memory waitlist store (Phase E: no DB yet — Phase F will persist to DB)
const waitlist: string[] = [];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email: string = (body.email ?? "").trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (waitlist.includes(email)) {
      // Idempotent — already on list, return 200
      return NextResponse.json({ ok: true, message: "Already on waitlist" });
    }

    waitlist.push(email);
    console.log(`[waitlist] +1 signup: ${email} (total: ${waitlist.length})`);

    return NextResponse.json({ ok: true, message: "Added to waitlist" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

// Health check — returns count (no emails exposed)
export async function GET() {
  return NextResponse.json({ count: waitlist.length });
}
