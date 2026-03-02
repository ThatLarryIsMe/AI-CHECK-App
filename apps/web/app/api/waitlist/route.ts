import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/db';

export async function POST(req: NextRequest) {
    try {
          const body = await req.json();
          const email: string = (body.email ?? '').trim().toLowerCase();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
      }

      // Insert if not exists (idempotent)
      const result = await query<{ id: string }>(
              `INSERT INTO waitlist_signups (email)
                     VALUES ($1)
                            ON CONFLICT (email) DO NOTHING
                                   RETURNING id`,
              [email]
            );

      if (result.length === 0) {
              // Email already existed
            return NextResponse.json({ ok: true, message: 'Already on waitlist' }, { status: 200 });
      }

      return NextResponse.json({ ok: true, message: 'Added to waitlist' }, { status: 201 });
    } catch (err) {
          console.error(JSON.stringify({ level: "error", event: "waitlist_post_failed", error: err instanceof Error ? err.message : String(err) }));
          return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET() {
    try {
          const result = await query<{ count: string }>(
                  'SELECT COUNT(*) as count FROM waitlist_signups'
                );
          const count = parseInt(result[0]?.count ?? '0', 10);
          // Return count only — no PII
      return NextResponse.json({ count });
    } catch (err) {
          console.error(JSON.stringify({ level: "error", event: "waitlist_get_failed", error: err instanceof Error ? err.message : String(err) }));
          return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
