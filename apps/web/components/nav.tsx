"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavProps = {
  user: { plan?: string; planStatus?: string; role?: string } | null;
};

const publicLinks = [
  { href: "/verify", label: "Check Facts" },
  { href: "/pricing", label: "Pricing" },
  { href: "/trust", label: "How It Works" },
  { href: "/tools", label: "Tools" },
];

export function Nav({ user }: NavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPro = user?.plan === "pro" && user?.planStatus === "active";
  const isAdmin = user?.role === "admin";

  function navLinkClass(href: string) {
    const active = pathname === href || pathname.startsWith(href + "/");
    return `text-sm transition ${
      active
        ? "text-white font-medium"
        : "text-slate-400 hover:text-white"
    }`;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-surface-800/60 bg-surface-950/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        {/* Wordmark */}
        <Link
          href="/"
          className="flex items-center gap-1.5 text-lg font-bold tracking-tight text-white hover:opacity-90 transition"
        >
          <svg width="22" height="22" viewBox="0 0 16 16" fill="none" className="text-brand-500">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Factward
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {publicLinks.map((link) => (
            <Link key={link.href} href={link.href} className={navLinkClass(link.href)}>
              {link.label}
            </Link>
          ))}

          {user ? (
            <>
              <Link href="/dashboard" className={navLinkClass("/dashboard")}>
                Dashboard
              </Link>
              {isAdmin && (
                <Link href="/admin" className={navLinkClass("/admin")}>
                  Admin
                </Link>
              )}
              <div className="h-4 w-px bg-slate-700" />
              {!isPro && (
                <Link
                  href="/pricing"
                  className="rounded-md bg-brand-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-brand-500"
                >
                  Upgrade
                </Link>
              )}
              <Link href="/account" className={navLinkClass("/account")}>
                Account
              </Link>
              <form action="/api/auth/logout" method="POST" className="inline">
                <button
                  type="submit"
                  className="text-sm text-slate-500 transition hover:text-slate-300"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="h-4 w-px bg-slate-700" />
              <Link href="/login" className={navLinkClass("/login")}>
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-500"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden p-2 text-slate-400 hover:text-white transition"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-surface-800/60 bg-surface-950/95 backdrop-blur-md px-6 py-4 space-y-3 animate-slide-in">
          {publicLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block ${navLinkClass(link.href)}`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          {user ? (
            <>
              <div className="border-t border-slate-800 pt-3 mt-3" />
              <Link
                href="/dashboard"
                className={`block ${navLinkClass("/dashboard")}`}
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/account"
                className={`block ${navLinkClass("/account")}`}
                onClick={() => setMobileOpen(false)}
              >
                Account
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`block ${navLinkClass("/admin")}`}
                  onClick={() => setMobileOpen(false)}
                >
                  Admin
                </Link>
              )}
              {!isPro && (
                <Link
                  href="/pricing"
                  className="block text-sm font-semibold text-brand-400"
                  onClick={() => setMobileOpen(false)}
                >
                  Upgrade to Pro
                </Link>
              )}
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-slate-500 hover:text-slate-300"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="border-t border-slate-800 pt-3 mt-3" />
              <Link
                href="/login"
                className={`block ${navLinkClass("/login")}`}
                onClick={() => setMobileOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="block text-sm font-semibold text-brand-400"
                onClick={() => setMobileOpen(false)}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
