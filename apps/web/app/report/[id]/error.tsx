"use client";

import Link from "next/link";

export default function ReportError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-slate-100">
      <h1 className="text-2xl font-bold text-red-400">Failed to load report</h1>
      <p className="mt-2 text-slate-400">
        Something went wrong while loading this verification report.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded bg-cyan-500 px-5 py-2 font-medium text-slate-950 transition hover:bg-cyan-400"
        >
          Try again
        </button>
        <Link
          href="/verify"
          className="rounded border border-slate-600 px-5 py-2 font-medium text-slate-300 transition hover:border-slate-400 hover:text-white"
        >
          New verification
        </Link>
      </div>
    </main>
  );
}
