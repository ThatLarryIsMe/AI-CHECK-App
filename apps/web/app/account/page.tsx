import { redirect } from "next/navigation"
import Link from "next/link"
import { getSessionFromCookie } from "@/lib/auth"
import { pool } from "@/lib/db"
import { analyzePackDecay } from "@/lib/decay"
import type { EvidencePack } from "@factward/core"

async function getUsageToday(userId: string, plan: string, planStatus: string, role: string): Promise<{ used: number; limit: number }> {
      try {
              const result = await pool.query<{ count: string }>(
                        `SELECT COUNT(*) AS count FROM user_rate_limits
                               WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
                        [userId]
                      )
              const used = parseInt(result.rows[0]?.count ?? "0", 10)
              const isAdmin = role === "admin"
              const isPro = plan === "pro" && planStatus === "active"
              const limit = isAdmin ? Infinity : isPro ? 200 : 2
              return { used, limit }
                             } catch {
              const isPro = plan === "pro" && planStatus === "active"
              return { used: 0, limit: role === "admin" ? Infinity : isPro ? 200 : 2 }
      }
}

interface StalePack {
      packId: string
      snippet: string
      freshness: number
      staleClaims: number
      totalClaims: number
      verifiedAt: string
}

async function getStalePacks(userId: string): Promise<StalePack[]> {
      try {
              const { rows } = await pool.query<{
                      pack_id: string
                      pack_json: EvidencePack
                      created_at: string
              }>(
                      `SELECT p.id AS pack_id, p.pack_json, p.created_at
                       FROM packs p
                       JOIN jobs j ON j.id = p.job_id
                       WHERE j.user_id = $1
                       ORDER BY p.created_at DESC
                       LIMIT 20`,
                      [userId]
              )

              const stale: StalePack[] = []
              for (const row of rows) {
                      const pack = row.pack_json
                      if (!pack?.claims?.length) continue
                      const decay = analyzePackDecay(pack.claims, row.created_at)
                      if (decay.packFreshness < 50) {
                              stale.push({
                                      packId: row.pack_id,
                                      snippet: pack.claims[0]?.text?.slice(0, 60) ?? "",
                                      freshness: decay.packFreshness,
                                      staleClaims: decay.staleClaims,
                                      totalClaims: pack.claims.length,
                                      verifiedAt: row.created_at,
                              })
                      }
                      if (stale.length >= 5) break
              }
              return stale
      } catch {
              return []
      }
}

function PlanBadge({ plan, status }: { plan: string; status: string }) {
      const isPro = plan === "pro" && status === "active"
      return (
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${isPro ? "bg-cyan-500/20 text-cyan-400" : "bg-slate-700 text-slate-300"}`}>
            {isPro ? "Pro" : "Free"}
        </span>
      )
}

export default async function AccountPage({
      searchParams,
}: {
            searchParams: { success?: string; canceled?: string }
}) {
      const user = await getSessionFromCookie()
            if (!user) {
                    redirect("/login")
            }

      const isPro = user.plan === "pro" && user.planStatus === "active"
            const periodEnd = user.currentPeriodEnd
                    ? new Date(user.currentPeriodEnd).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                    })
                    : null

      const { used, limit } = await getUsageToday(user.userId, user.plan, user.planStatus, user.role)
      const isUnlimited = !isFinite(limit)
      const usagePercent = isUnlimited ? 0 : Math.min(100, (used / limit) * 100)

      // Fetch stale packs for the decay alerts section
      const stalePacks = await getStalePacks(user.userId)

            return (
              <main className="min-h-screen bg-slate-950 px-4 py-16">
                <div className="mx-auto max-w-md">
                  <h1 className="mb-6 text-2xl font-bold text-white">Your account</h1>

                  {searchParams.success === "1" && (
                    <div className="mb-5 rounded-lg border border-green-700 bg-green-950/40 px-4 py-3 text-sm text-green-400">
                      Subscription activated — welcome to Pro!
                    </div>
                  )}
                  {searchParams.canceled === "1" && (
                    <div className="mb-5 rounded-lg border border-yellow-700 bg-yellow-950/40 px-4 py-3 text-sm text-yellow-400">
                      Checkout canceled. No changes were made.
                    </div>
                  )}

                  <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
                    {/* Email */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
                      <p className="mt-1 font-medium text-white">{user.email}</p>
                    </div>

                    {/* Plan */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</p>
                      <div className="mt-1 flex items-center gap-2">
                        <PlanBadge plan={user.plan} status={user.planStatus} />
                        <span className="text-sm text-slate-500">
                          {user.planStatus === "past_due" && "(payment past due)"}
                          {user.planStatus === "canceled" && "(canceled)"}
                          {user.planStatus === "inactive" && !isPro && ""}
                        </span>
                      </div>
                    </div>

                    {/* Usage today */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Usage today</p>
                      <p className="mt-1 font-medium text-white">
                        {used}{isUnlimited ? "" : ` / ${limit}`} verification{used !== 1 ? "s" : ""}{isUnlimited ? " (unlimited)" : ""}
                      </p>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${used >= limit ? "bg-red-500" : "bg-cyan-500"}`}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Renewal */}
                    {periodEnd && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {isPro ? "Renews" : "Expires"}
                        </p>
                        <p className="mt-1 font-medium text-white">{periodEnd}</p>
                      </div>
                    )}
                  </section>

                  {/* Stale verification alerts */}
                  {stalePacks.length > 0 && (
                    <section className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-yellow-400 text-lg">&#9888;</span>
                        <h2 className="text-sm font-semibold text-yellow-400">
                          {stalePacks.length} verification{stalePacks.length > 1 ? "s" : ""} going stale
                        </h2>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">
                        Claims decay over time as facts change. Re-verify to keep your reports current.
                      </p>
                      <ul className="space-y-2">
                        {stalePacks.map((sp) => (
                          <li key={sp.packId}>
                            <Link
                              href={`/report/${sp.packId}`}
                              className="block rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 transition hover:border-yellow-500/50"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm text-slate-200 truncate flex-1">{sp.snippet}&hellip;</p>
                                <span className={`shrink-0 text-xs font-semibold ${
                                  sp.freshness < 25 ? "text-red-400" : "text-yellow-400"
                                }`}>
                                  {sp.freshness}% fresh
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                {sp.staleClaims} of {sp.totalClaims} claims stale
                              </p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <div className="mt-6 flex flex-col gap-3">
                    {!isPro && (
                      <form action="/api/billing/checkout" method="POST">
                        <button
                          type="submit"
                          className="w-full rounded-lg bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
                        >
                          Upgrade to Pro
                        </button>
                      </form>
                    )}

                    {isPro && (
                      <form action="/api/billing/portal" method="POST">
                        <button
                          type="submit"
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
                        >
                          Manage billing
                        </button>
                      </form>
                    )}

                    <form action="/api/auth/logout" method="POST">
                      <button
                        type="submit"
                        className="w-full rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-500 transition hover:border-slate-600 hover:text-slate-300"
                      >
                        Sign out
                      </button>
                    </form>
                  </div>
                </div>
              </main>
            )
}
