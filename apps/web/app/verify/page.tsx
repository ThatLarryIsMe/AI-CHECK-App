"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error("Verification request failed");
      }

      const data = (await response.json()) as { jobId: string };
      router.push(`/jobs/${data.jobId}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 text-slate-100">
      <h1 className="text-3xl font-semibold text-cyan-300">Verify text</h1>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <textarea
          className="h-48 w-full rounded-lg border border-slate-700 bg-slate-900 p-4"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste text with claims to verify"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Run verification"}
        </button>
      </form>
      {error ? <p className="mt-4 text-red-400">{error}</p> : null}
    </main>
  );
}
