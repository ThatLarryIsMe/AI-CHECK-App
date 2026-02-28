import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

type RequestLike = NextRequest | Request | { headers: Headers; url: string };

function safeCompare(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, "utf8");
    const bBuf = Buffer.from(b, "utf8");
    if (aBuf.length !== bBuf.length) {
      // Still run comparison to avoid timing leak on length
      timingSafeEqual(aBuf, aBuf);
      return false;
    }
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

export function requireBetaKey(
  req: RequestLike
): { ok: true } | { ok: false; reason: string } {
  const expectedKey = process.env.BETA_ACCESS_KEY?.trim();

  if (!expectedKey) {
    return { ok: false, reason: "Invite-only beta is not configured." };
  }

  // Header-only: query param key is intentionally NOT supported
  // to prevent key leakage in server logs and proxy headers.
  const providedKey = (req.headers as Headers).get("x-proofmode-key")?.trim();

  if (!providedKey || !safeCompare(providedKey, expectedKey)) {
    return {
      ok: false,
      reason: "Invite-only beta. Invalid or missing access key.",
    };
  }

  return { ok: true };
}
