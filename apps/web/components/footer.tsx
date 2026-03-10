import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-surface-800/60 bg-surface-950">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          {/* Brand */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-bold text-white">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-brand-500">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Factward
            </div>
            <p className="text-xs text-slate-500 max-w-xs">
              Source-backed fact-checking for journalists, researchers, and content professionals. Every claim verified against real evidence.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-12 text-sm">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Product</p>
              <Link href="/verify" className="block text-slate-400 hover:text-white transition">
                Check Facts
              </Link>
              <Link href="/pricing" className="block text-slate-400 hover:text-white transition">
                Pricing
              </Link>
              <Link href="/tools" className="block text-slate-400 hover:text-white transition">
                Tools
              </Link>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Company</p>
              <Link href="/trust" className="block text-slate-400 hover:text-white transition">
                How It Works
              </Link>
              <Link href="/trust#data" className="block text-slate-400 hover:text-white transition">
                Privacy
              </Link>
              <Link href="/contact" className="block text-slate-400 hover:text-white transition">
                Contact Us
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-10 text-xs text-slate-600">
          &copy; {new Date().getFullYear()} Factward. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
