import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import "./globals.css";
import { VERSION } from "@/../../version";
import { pool } from "@/lib/db";

export const metadata: Metadata = {
    title: "ProofMode AI",
    description: "Structured claim verification with transparent reasoning.",
};

// Phase P4: Auth-aware nav — reads session cookie server-side
interface NavUser {
    userId: string;
    plan: string;
    planStatus: string;
}

async function getNavUser(): Promise<NavUser | null> {
    try {
          const cookieStore = cookies();
          const token = cookieStore.get("pm_session")?.value;
          if (!token) return null;
          const result = await pool.query<{
                  user_id: string;
                  plan: string;
                  plan_status: string;
          }>(
                  `SELECT s.user_id, u.plan, u.plan_status
                         FROM sessions s
                                JOIN users u ON u.id = s.user_id
                                       WHERE s.token = $1 AND s.expires_at > NOW()`,
                  [token]
                );
          const row = result.rows[0];
          if (!row) return null;
          return { userId: row.user_id, plan: row.plan, planStatus: row.plan_status };
    } catch {
          return null;
    }
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const navUser = await getNavUser();
    const isPro = navUser?.plan === "pro" && navUser?.planStatus === "active";

  return (
        <html lang="en">
              <body className="min-h-screen bg-slate-950 text-slate-100">
                {/* Global nav */}
                      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm">
                                <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
                                  {/* Wordmark */}
                                            <Link
                                                            href="/"
                                                            className="flex items-center gap-2 text-sm font-bold tracking-wide text-cyan-400 hover:text-cyan-300"
                                                          >
                                                          <span className="text-slate-100">Proof</span>span>Mode
                                                          <span className="ml-1 rounded bg-slate-800 px-1.5 py-0.5 text-xs font-normal text-slate-400">
                                                                          v{VERSION}
                                                          </span>span>
                                            </Link>Link>
                                
                                  {/* Nav links */}
                                            <div className="flex items-center gap-5 text-sm">
                                                          <Link
                                                                            href="/verify"
                                                                            className="text-slate-400 transition hover:text-cyan-400"
                                                                          >
                                                                          Verify
                                                          </Link>Link>
                                                          <Link
                                                                            href="/trust"
                                                                            className="text-slate-400 transition hover:text-cyan-400"
                                                                          >
                                                                          Trust
                                                          </Link>Link>
                                            
                                              {navUser ? (
                          // Authenticated state
                          <>
                            {!isPro && (
                                                <Link
                                                                        href="/account"
                                                                        className="rounded bg-cyan-500 px-3 py-1 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
                                                                      >
                                                                      Upgrade
                                                </Link>Link>
                                            )}
                                            <Link
                                                                  href="/account"
                                                                  className="text-slate-400 transition hover:text-cyan-400"
                                                                >
                                                                Account
                                            </Link>Link>
                                            <form action="/api/auth/logout" method="POST" className="inline">
                                                                <button
                                                                                        type="submit"
                                                                                        className="text-slate-500 transition hover:text-slate-300 text-sm"
                                                                                      >
                                                                                      Logout
                                                                </button>button>
                                            </form>form>
                          </>>
                        ) : (
                          // Unauthenticated state
                          <>
                                            <Link
                                                                  href="/login"
                                                                  className="text-slate-400 transition hover:text-cyan-400"
                                                                >
                                                                Login
                                            </Link>Link>
                                            <Link
                                                                  href="/signup"
                                                                  className="rounded bg-cyan-500 px-3 py-1.5 font-semibold text-slate-950 transition hover:bg-cyan-400"
                                                                >
                                                                Sign Up
                                            </Link>Link>
                          </>>
                        )}
                                            </div>div>
                                </nav>nav>
                      </header>header>
              
                {/* Page content */}
                {children}
              </body>body>
        </html>html>
      );
}</></></html>
