"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type JobStatusResponse = {
  status: "queued" | "processing" | "complete" | "failed";
  packId?: string;
};

export default function JobPage({ params }: { params: { id: string } }) {
  const [job, setJob] = useState<JobStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const response = await fetch(`/api/jobs/${params.id}`);
        if (!response.ok) {
          throw new Error("Unable to load job");
        }

        const data = (await response.json()) as JobStatusResponse;
        if (active) {
          setJob(data);
          setError(null);
        }

        if (data.status === "complete" || data.status === "failed") {
          return;
        }

        setTimeout(poll, 2000);
      } catch (pollError) {
        if (active) {
          setError(pollError instanceof Error ? pollError.message : "Polling failed");
        }
      }
    }

    poll();

    return () => {
      active = false;
    };
  }, [params.id]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 text-slate-100">
      <h1 className="text-3xl font-semibold text-cyan-300">Job {params.id}</h1>
      {error ? <p className="mt-4 text-red-400">{error}</p> : null}
      {!job ? <p className="mt-4">Loading...</p> : null}
      {job ? (
        <>
          <p className="mt-4 text-lg">Status: {job.status}</p>
          {job.status === "complete" && job.packId ? (
            <Link className="mt-4 text-cyan-300 underline" href={`/packs/${job.packId}`}>
              View evidence pack
            </Link>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
