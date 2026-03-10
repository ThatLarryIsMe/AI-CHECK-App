import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookie } from "@/lib/auth";
import { pool } from "@/lib/db";

interface VerificationRow {
  pack_id: string;
  input_text: string | null;
  status: string;
  created_at: Date;
  claims_count: number;
  supported_count: number;
  unsupported_count: number;
  trust_score: number;
}

async function getUserVerifications(userId: string): Promise<VerificationRow[]> {
  const { rows } = await pool.query<VerificationRow>(
    `SELECT
       p.id AS pack_id,
       j.input_text,
       j.status,
       j.created_at,
       COALESCE(jsonb_array_length(p.pack_json->'claims'), 0) AS claims_count,
       COALESCE((
         SELECT COUNT(*) FROM jsonb_array_elements(p.pack_json->'claims') c
         WHERE c->>'status' = 'supported'
       ), 0) AS supported_count,
       COALESCE((
         SELECT COUNT(*) FROM jsonb_array_elements(p.pack_json->'claims') c
         WHERE c->>'status' = 'unsupported'
       ), 0) AS unsupported_count,
       CASE
         WHEN COALESCE((
           SELECT COUNT(*) FROM jsonb_array_elements(p.pack_json->'claims') c
           WHERE c->>'status' IN ('supported', 'mixed', 'unsupported')
         ), 0) = 0 THEN 0
         ELSE ROUND(
           COALESCE((SELECT COUNT(*) FROM jsonb_array_elements(p.pack_json->'claims') c WHERE c->>'status' = 'supported'), 0) * 100.0
           / COALESCE((SELECT COUNT(*) FROM jsonb_array_elements(p.pack_json->'claims') c WHERE c->>'status' IN ('supported', 'mixed', 'unsupported')), 1)
         )
       END AS trust_score
     FROM jobs j
     JOIN packs p ON p.job_id = j.id
     WHERE j.user_id = $1 AND j.status = 'complete'
     ORDER BY j.created_at DESC
     LIMIT 50`,
    [userId]
  );
  return rows;
}

function TrustBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? "text-green-400 bg-green-500/10 border-green-500/30"
      : score >= 40 ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"
        : "text-red-400 bg-red-500/10 border-red-500/30";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${color}`}>
      {score}%
    </span>
  );
}

export default async function DashboardPage() {
  const user = await getSessionFromCookie();
  if (!user) {
    redirect("/login");
  }

  const verifications = await getUserVerifications(user.userId);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Your Verifications</h1>
            <p className="mt-1 text-sm text-slate-400">
              {verifications.length} verification{verifications.length !== 1 ? "s" : ""} completed
            </p>
          </div>
          <Link
            href="/verify"
            className="rounded-lg bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            New Check
          </Link>
        </div>

        {verifications.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
            <p className="text-lg font-medium text-slate-300">No verifications yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Paste an article, drop a URL, or upload a PDF — your first verification report
              takes less than a minute.
            </p>
            <Link
              href="/verify"
              className="mt-6 inline-block rounded-lg bg-cyan-500 px-6 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Verify Your First Piece
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {verifications.map((v) => {
              const snippet = v.input_text
                ? v.input_text.length > 120
                  ? v.input_text.slice(0, 117) + "..."
                  : v.input_text
                : "—";

              return (
                <Link
                  key={v.pack_id}
                  href={`/report/${v.pack_id}`}
                  className="block rounded-xl border border-slate-800 bg-slate-900 p-4 transition hover:border-slate-700 hover:bg-slate-800"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-200">
                        {snippet}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>{new Date(v.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}</span>
                        <span>{v.claims_count} claim{v.claims_count !== 1 ? "s" : ""}</span>
                        <span className="text-green-400">{v.supported_count} supported</span>
                        <span className="text-red-400">{v.unsupported_count} unsupported</span>
                      </div>
                    </div>
                    <TrustBadge score={Number(v.trust_score)} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
