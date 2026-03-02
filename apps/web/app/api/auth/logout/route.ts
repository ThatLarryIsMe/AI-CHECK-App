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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const response = NextResponse.redirect(`${appUrl}/login`, 303);
  clearSessionCookie(response);
  return response;
}
