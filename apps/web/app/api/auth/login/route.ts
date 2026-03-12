import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import {
  verifyPassword,
  createSession,
  setSessionCookie,
} from "@/lib/auth";

// Brute-force protection — 5 attempts per IP per 15 minutes (DB-backed, serverless-safe)
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_WINDOW_MINUTES = 15;

async function checkLoginRateLimit(ip: string): Promise<boolean> {
  const since = new Date();
  since.setMinutes(since.getMinutes() - LOGIN_WINDOW_MINUTES);

  const result = await pool.query<{ id: number }>(
    `INSERT INTO login_attempts (ip)
     SELECT $1
     WHERE (SELECT COUNT(*) FROM login_attempts WHERE ip = $1 AND attempted_at >= $2) < $3
     RETURNING id`,
    [ip, since.toISOString(), LOGIN_ATTEMPT_LIMIT]
  );
  return result.rows.length === 0; // true = rate limited
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const limited = await checkLoginRateLimit(ip);
  if (limited) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait 15 minutes." },
      { status: 429 }
    );
  }

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

  const response = NextResponse.json({ ok: true, token }, { status: 200 });
  setSessionCookie(response, token, expiresAt);
  return response;
}
