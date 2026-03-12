import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
  email: z.string().email(),
});

/**
 * POST /api/auth/forgot-password
 *
 * Always returns 200 to prevent email enumeration.
 * TODO: integrate with email service (e.g. Resend, SES) to send actual reset links.
 */
export async function POST(request: NextRequest) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  // Log for now — replace with actual email sending
  console.log(`[forgot-password] Reset requested for: ${body.email}`);

  // Always return success to prevent email enumeration
  return NextResponse.json({ ok: true });
}
