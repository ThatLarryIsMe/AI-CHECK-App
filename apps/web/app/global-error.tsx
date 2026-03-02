"use client";

// Catches errors thrown inside the root layout itself.
// Must render its own <html> and <body> because the root layout is
// replaced when this boundary activates.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950">
        <main className="flex min-h-screen flex-col items-center justify-center px-6 text-slate-100">
          <h1 className="text-2xl font-bold text-red-400">
            Something went wrong
          </h1>
          <p className="mt-2 text-slate-400">
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            className="mt-6 rounded bg-cyan-500 px-5 py-2 font-medium text-slate-950 transition hover:bg-cyan-400"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
