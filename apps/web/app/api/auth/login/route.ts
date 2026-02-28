import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import {
  verifyPassword,
  createSession,
  setSessionCookie,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password } = (body as Record<string, string>) ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "email and password are required" },
      { status: 400 }
    );
  }

  const trimmedEmail = email.trim().toLowerCase();

  const result = await pool.query<{ id: string; password_hash: string }>(
    `SELECT id, password_hash FROM users WHERE email = $1`,
    [trimmedEmail]
  );

  const user = result.rows[0];
  if (!user || !user.password_hash) {
    // Constant-time: run hash check even on miss to prevent user enumeration
    await verifyPassword("dummy", "00:00");
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const { token, expiresAt } = await createSession(user.id);

  const response = NextResponse.json({ ok: true }, { status: 200 });
  setSessionCookie(response, token, expiresAt);
  return response;
}
