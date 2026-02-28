import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { VERSION } from "@/../../version";

export const metadata: Metadata = {
  title: "ProofMode AI",
  description: "Structured claim verification with transparent reasoning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
            <div className="flex items-center gap-6 text-sm">
              <Link
                href="/verify"
                className="text-slate-400 transition hover:text-cyan-400"
              >
                Verify
              </Link>
              <Link
                href="/trust"
                className="text-slate-400 transition hover:text-cyan-400"
              >
                Trust
              </Link>
              <Link
                href="/admin"
                className="text-slate-500 transition hover:text-slate-300"
              >
                Admin
              </Link>
            </div>
          </nav>
        </header>

        {/* Page content */}
        {children}
      </body>
    </html>
  );
}
