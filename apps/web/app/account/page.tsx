import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { pool } from "@/lib/db"

// Phase P4: Account page — redirect fix (/login), logout button, usage display

interface AccountUser {
      email: string
      plan: string
      plan_status: string
      current_period_end: Date | null
      user_id: string
}

async function getAccountUser(): Promise<AccountUser | null> {
      const cookieStore = cookies()
      const token = cookieStore.get("pm_session")?.value
      if (!token) return null
      const result = await pool.query<AccountUser>(
              `SELECT u.id AS user_id, u.email, u.plan, u.plan_status, u.current_period_end
                   FROM sessions s JOIN users u ON u.id = s.user_id
                        WHERE s.token = $1 AND s.expires_at > NOW()`,
              [token]
            )
      return result.rows[0] ?? null
}

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
              <span
                        style={{
            display: "inline-block",
                                    padding: "2px 10px",
                                    borderRadius: "12px",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    background: isPro ? "#6366f1" : "#e5e7eb",
            color: isPro ? "#fff" : "#374151",
                                    textTransform: "uppercase",
                  letterSpacing: "0.05em",
                        }}
                      >
                  {isPro ? "Pro" : "Free"}
              </span>span>
            )
}
          
export default async function AccountPage({
      searchParams,
}: {
            searchParams: { success?: string; canceled?: string }
}) {
      const user = await getAccountUser()
            if (!user) {
                    redirect("/login")
            }
    
      const isPro = user.plan === "pro" && user.plan_status === "active"
            const periodEnd = user.current_period_end
                    ? new Date(user.current_period_end).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                    })
                    : null
                
      const { used, limit } = await getUsageToday(user.user_id, user.plan, user.plan_status)
                                                  
            return (
              <main style={{ maxWidth: 480, margin: "80px auto", fontFamily: "system-ui, sans-serif", padding: "0 16px" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 24 }}>Account</h1>

                  {searchParams.success === "1" && (
                          <div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#065f46" }}>
                                    Subscription activated. Welcome to Pro!
                          </div>
                        )}
{searchParams.canceled === "1" && (
        <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#92400e" }}>
                  Checkout canceled. No changes were made.
        </div>div>
                                             )}
              
      <section style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <div style={{ marginBottom: 16 }}>
                        <span style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</span>span>
                        <p style={{ marginTop: 4, fontWeight: 500 }}>{user.email}</p>p>
              </div>div>
      
              <div style={{ marginBottom: 16 }}>
                        <span style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Plan</span>span>
                        <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                                    <PlanBadge plan={user.plan} status={user.plan_status} />
                                    <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                                        {user.plan_status === "past_due" && "(payment past due)"}
                                        {user.plan_status === "canceled" && "(canceled)"}
                                        {user.plan_status === "inactive" && !isPro && "(no active subscription)"}
                                    </span>span>
                        </div>div>
              </div>div>
                                        
          {/* Usage today */}
              <div style={{ marginBottom: periodEnd ? 16 : 0 }}>
                        <span style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Usage today</span>span>
                        <p style={{ marginTop: 4, fontWeight: 500 }}>
                            {used} / {limit} verifications
                        </p>p>
                        <div style={{ marginTop: 6, height: 6, borderRadius: 3, background: "#e5e7eb", overflow: "hidden" }}>
                                    <div
                                                      style={{
                                                                          height: "100%",
                                                                          width: `${Math.min(100, (used / limit) * 100)}%`,
                                                                          background: used >= limit ? "#ef4444" : "#6366f1",
                                                                          borderRadius: 3,
                                                      }}
                                                    />
                        </div>
              </div>div>
      
          {periodEnd && (
              <div>
                          <span style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              {isPro ? "Renews" : "Expires"}
                          </span>span>
                          <p style={{ marginTop: 4, fontWeight: 500 }}>{periodEnd}</p>p>
              </div>div>
              )}
      </section>section>
              
                                           <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                               {!isPro && (
              <form action="/api/billing/checkout" method="POST">
                          <button
                                            type="submit"
                                            style={{
                                                                width: "100%",
                                                                padding: "12px 24px",
                                                                background: "#6366f1",
                                                                color: "#fff",
                                                                border: "none",
                                                                borderRadius: 8,
                                                                fontWeight: 600,
                                                                fontSize: "1rem",
                                                                cursor: "pointer",
                                            }}
                                          >
                                        Upgrade to Pro — $X/month
                          </button>button>
              </form>form>
                                                   )}
                                           
                                               {isPro && (
              <form action="/api/billing/portal" method="POST">
                          <button
                                            type="submit"
                                            style={{
                                                                width: "100%",
                                                                padding: "12px 24px",
                                                                background: "#fff",
                    color: "#374151",
                                                                border: "1px solid #d1d5db",
                                                                borderRadius: 8,
                                                                fontWeight: 600,
                                                                fontSize: "1rem",
                                                                cursor: "pointer",
                                            }}
                                          >
                  Manage Billing
                          </button>button>
              </form>form>
                                                   )}
                                           
                                               {/* Logout */}
                                                   <form action="/api/auth/logout" method="POST">
                                                             <button
                                                                             type="submit"
                                                                             style={{
              width: "100%",
                                                                                               padding: "10px 24px",
                                                                                               background: "transparent",
                                                                                               color: "#6b7280",
                  border: "1px solid #d1d5db",
                                                                                               borderRadius: 8,
                                                                                               fontWeight: 500,
                                                                                               fontSize: "0.9rem",
                                                                                               cursor: "pointer",
                                                                             }}
                                                                           >
                                                                         Log out
                                                             </button>button>
                                                   </form>
                                           </div>div>
              </main>main>
                  )
}</span>
