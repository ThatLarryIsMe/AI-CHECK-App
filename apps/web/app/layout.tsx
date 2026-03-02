import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { VERSION } from "@/../../version";
import { getSessionFromCookie } from "@/lib/auth";

export const metadata: Metadata = {
    title: "ProofMode — AI Fact Checking in Seconds",
    description: "Paste any text and get a claim-by-claim verification report backed by real sources. Built for journalists, researchers, and anyone who cares about accuracy.",
    icons: { icon: "/favicon.svg" },
    openGraph: {
        title: "ProofMode — AI Fact Checking in Seconds",
        description: "Paste any text and get a claim-by-claim verification report backed by real sources.",
        siteName: "ProofMode",
        type: "website",
    },
    twitter: {
        card: "summary",
        title: "ProofMode — AI Fact Checking in Seconds",
        description: "Paste any text and get a claim-by-claim verification report backed by real sources.",
    },
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const navUser = await getSessionFromCookie();
    const isPro = navUser?.plan === "pro" && navUser?.planStatus === "active";
    const isAdmin = navUser?.role === "admin";


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
                                                          <span className="text-slate-100">Proof</span>Mode
                                                          <span className="ml-1 rounded bg-slate-800 px-1.5 py-0.5 text-xs font-normal text-slate-400">
                                                                          v{VERSION}
                                                          </span>
                                            </Link>

                                  {/* Nav links */}
                                            <div className="flex items-center gap-5 text-sm">
                                                          <Link
                                                                            href="/verify"
                                                                            className="text-slate-400 transition hover:text-cyan-400"
                                                                          >
                                                                          Check Facts
                                                          </Link>
                                                          <Link
                                                                            href="/pricing"
                                                                            className="text-slate-400 transition hover:text-cyan-400"
                                                                          >
                                                                          Pricing
                                                          </Link>
                                                          <Link
                                                                            href="/trust"
                                                                            className="text-slate-400 transition hover:text-cyan-400"
                                                                          >
                                                                          How It Works
                                                          </Link>

                                              {navUser ? (
                          // Authenticated state
                          <>
                            {!isPro && (
                                                <Link
                                                                        href="/account"
                                                                        className="rounded bg-cyan-500 px-3 py-1 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
                                                                      >
                                                                      Upgrade
                                                </Link>
                                            )}
                                            <Link
                                                                  href="/account"
                                                                  className="text-slate-400 transition hover:text-cyan-400"
                                                                >
                                                                Account
                                            </Link>
                                            {isAdmin && (
                                            <Link
                                                                  href="/admin"
                                                                  className="text-slate-400 transition hover:text-cyan-400"
                                                                >
                                                                Admin
                                            </Link>
                                            )}
                                            <form action="/api/auth/logout" method="POST" className="inline">
                                                                <button
                                                                                        type="submit"
                                                                                        className="text-slate-500 transition hover:text-slate-300 text-sm"
                                                                                      >
                                                                                      Logout
                                                                </button>
                                            </form>
                          </>
                        ) : (
                          // Unauthenticated state
                          <>
                                            <Link
                                                                  href="/login"
                                                                  className="text-slate-400 transition hover:text-cyan-400"
                                                                >
                                                                Login
                                            </Link>
                                            <Link
                                                                  href="/signup"
                                                                  className="rounded bg-cyan-500 px-3 py-1.5 font-semibold text-slate-950 transition hover:bg-cyan-400"
                                                                >
                                                                Sign Up
                                            </Link>
                          </>
                        )}
                                            </div>
                                </nav>
                      </header>

                {/* Page content */}
                {children}
              </body>
        </html>
      );
}
