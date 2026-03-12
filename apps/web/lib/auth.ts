import { createHash, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

const scryptAsync = promisify(scrypt);

// C8: Hash session tokens with SHA-256 before DB storage
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const SALT_LEN = 16;
const KEY_LEN = 64;
const SESSION_DAYS = 14;
const COOKIE_NAME = "pm_session";

// ---------------------------------------------------------------------------
// Password helpers (scrypt — no external deps)
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [salt, storedKey] = stored.split(":");
  if (!salt || !storedKey) return false;
  const derivedKey = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  const storedBuf = Buffer.from(storedKey, "hex");
  if (derivedKey.length !== storedBuf.length) return false;
  return timingSafeEqual(derivedKey, storedBuf);
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

export async function createSession(
  userId: string
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  await pool.query(
    `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [userId, hashToken(token), expiresAt.toISOString()]
  );

  return { token, expiresAt };
}

export async function deleteSession(token: string): Promise<void> {
  await pool.query(`DELETE FROM sessions WHERE token = $1`, [hashToken(token)]);
}

interface SessionUser {
  userId: string;
  email: string;
}

export async function getUserFromRequest(
  request: NextRequest
): Promise<SessionUser | null> {
  // Check cookie first, then fall back to Bearer token (for browser extension)
  let token = request.cookies.get(COOKIE_NAME)?.value ?? null;
  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }
  if (!token) return null;

  const result = await pool.query<{ user_id: string; email: string }>(
    `SELECT s.user_id, u.email
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1
       AND s.expires_at > NOW()`,
    [hashToken(token)]
  );

  if (!result.rows[0]) return null;
  return { userId: result.rows[0].user_id, email: result.rows[0].email };
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date
): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

// ---------------------------------------------------------------------------
// Server-component session helper (reads from next/headers cookies)
// M3: Single source of truth for cookie-based session reads
// ---------------------------------------------------------------------------

export interface ServerSessionUser {
  userId: string;
  email: string;
  plan: string;
  planStatus: string;
  currentPeriodEnd: Date | null;
  role: string;
  inviteChecksRemaining: number;
}

export async function getSessionFromCookie(): Promise<ServerSessionUser | null> {
  const { cookies } = await import("next/headers");
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const result = await pool.query<{
      user_id: string;
      email: string;
      plan: string;
      plan_status: string;
      current_period_end: Date | null;
      role: string;
    }>(
      `SELECT s.user_id, u.email, u.plan, u.plan_status, u.current_period_end, u.role
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [hashToken(token)]
    );
    const row = result.rows[0];
    if (!row) return null;

    // Fetch invite bonus checks separately so login doesn't break if column doesn't exist yet
    let inviteChecksRemaining = 0;
    try {
      const inviteResult = await pool.query<{ invite_checks_remaining: number }>(
        `SELECT invite_checks_remaining FROM users WHERE id = $1`,
        [row.user_id]
      );
      inviteChecksRemaining = inviteResult.rows[0]?.invite_checks_remaining ?? 0;
    } catch {
      // Column may not exist yet — that's fine, default to 0
    }

    return {
      userId: row.user_id,
      email: row.email,
      plan: row.plan,
      planStatus: row.plan_status,
      currentPeriodEnd: row.current_period_end,
      role: row.role ?? "user",
      inviteChecksRemaining,
    };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
