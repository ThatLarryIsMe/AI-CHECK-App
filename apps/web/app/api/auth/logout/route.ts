import { NextRequest, NextResponse } from "next/server";
import { deleteSession, clearSessionCookie, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (token) {
    // Best-effort: delete session row
    try {
      await deleteSession(token);
    } catch {
      // Non-fatal — cookie will still be cleared
    }
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  clearSessionCookie(response);
  return response;
}
