import { redirect } from "next/navigation"
import { getSessionFromCookie } from "@/lib/auth"
import { pool } from "@/lib/db"

async function getUsageToday(userId: string, plan: string, planStatus: string): Promise<{ used: number; limit: number }> {
      try {
              const result = await pool.query<{ count: string }>(
                        `SELECT COUNT(*) AS count FROM user_rate_limits
                               WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
                        [userId]
                      )
              const used = parseInt(result.rows[0]?.count ?? "0", 10)
              const isPro = plan === "pro" && planStatus === "active"
              const limit = isPro ? 200 : 10
              return { used, limit }
                             } catch {
              return { used: 0, limit: plan === "pro" && planStatus === "active" ? 200 : 10 }
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

      const { used, limit } = await getUsageToday(user.userId, user.plan, user.planStatus)
      const usagePercent = Math.min(100, (used / limit) * 100)

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
                        {used} / {limit} verifications
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
