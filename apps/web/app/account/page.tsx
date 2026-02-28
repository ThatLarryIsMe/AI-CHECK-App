import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { pool } from "@/lib/db"

// Phase P3.1: Account page — server component
// Shows plan info and billing actions

interface AccountUser {
    email: string
    plan: string
    plan_status: string
    current_period_end: Date | null
}

async function getAccountUser(): Promise<AccountUser | null> {
    const cookieStore = cookies()
    const token = cookieStore.get("pm_session")?.value
    if (!token) return null

  const result = await pool.query<AccountUser>(
        `SELECT u.email, u.plan, u.plan_status, u.current_period_end
             FROM sessions s
                  JOIN users u ON u.id = s.user_id
                       WHERE s.token = $1 AND s.expires_at > NOW()`,
        [token]
      )
    return result.rows[0] ?? null
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
              redirect("/signin")
        }
  
    const isPro = user.plan === "pro" && user.plan_status === "active"
        const periodEnd = user.current_period_end
              ? new Date(user.current_period_end).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
              })
              : null
          
            return (
                  <main style={{ maxWidth: 480, margin: "80px auto", fontFamily: "system-ui, sans-serif", padding: "0 16px" }}>
                        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 24 }}>Account</h1>h1>
                  
                    {searchParams.success === "1" && (
                            <div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#065f46" }}>
                                      Subscription activated. Welcome to Pro!
                            </div>div>
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
                        </div>div>
                  </main>main>
                )
}</span>
