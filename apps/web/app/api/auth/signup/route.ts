import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import {
  hashPassword,
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

  const { email, password, inviteCode } =
    (body as Record<string, string>) ?? {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof inviteCode !== "string"
  ) {
    return NextResponse.json(
      { error: "email, password, and inviteCode are required" },
      { status: 400 }
    );
  }

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !password) {
    return NextResponse.json(
      { error: "email and password must not be empty" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const expectedCode = process.env.INVITE_CODE;
  if (!expectedCode || inviteCode !== expectedCode) {
    return NextResponse.json(
      { error: "Invalid invite code" },
      { status: 403 }
    );
  }

  // Check for existing user
  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE email = $1`,
    [trimmedEmail]
  );
  if (existing.rows.length > 0) {
    return NextResponse.json(
      { error: "An account with that email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();

  await pool.query(
    `INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)`,
    [userId, trimmedEmail, passwordHash]
  );

  const { token, expiresAt } = await createSession(userId);

  const response = NextResponse.json({ ok: true }, { status: 201 });
  setSessionCookie(response, token, expiresAt);
  return response;
}
