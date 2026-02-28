import { NextRequest } from "next/server";

type RequestLike = NextRequest | Request | { headers: Headers; url: string };

export function requireBetaKey(
  req: RequestLike
): { ok: true } | { ok: false; reason: string } {
  const expectedKey = process.env.BETA_ACCESS_KEY?.trim();

  if (!expectedKey) {
    return { ok: false, reason: "Invite-only beta is not configured." };
  }

  const headerKey = req.headers.get("x-proofmode-key")?.trim();
  const queryKey = new URL(req.url).searchParams.get("key")?.trim();
  const providedKey = headerKey || queryKey;

  if (!providedKey || providedKey !== expectedKey) {
    return {
      ok: false,
      reason: "Invite-only beta. Invalid or missing access key.",
    };
  }

  return { ok: true };
}
