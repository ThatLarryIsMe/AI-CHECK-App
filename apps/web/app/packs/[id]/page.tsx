"use client";

import { useEffect, useState } from "react";
import type { EvidencePack } from "@proofmode/core";

const STATUS_LABELS: Record<string, string> = {
    supported: "Supported",
    mixed: "Not Enough Info",
    unsupported: "Refuted",
};

const STATUS_COLORS: Record<string, string> = {
    supported: "text-green-400",
    mixed: "text-yellow-400",
    unsupported: "text-red-400",
};

export default function PackPage({ params }: { params: { id: string } }) {
  const [pack, setPack] = useState<EvidencePack | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPack() {
      try {
        const response = await fetch(`/api/packs/${params.id}`);

        if (!response.ok) {
          throw new Error("Unable to load evidence pack");
        }

        const data = (await response.json()) as EvidencePack;
        setPack(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unexpected error");
      }
    }

    void loadPack();
  }, [params.id]);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-12 text-slate-100">
      <h1 className="text-3xl font-semibold text-cyan-300">Evidence pack {params.id}</h1>
      {error ? <p className="mt-4 text-red-400">{error}</p> : null}
      {pack ? (
        <pre className="mt-6 overflow-auto rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm">
          {JSON.stringify(pack, null, 2)}
        </pre>
      ) : (
        <p className="mt-4">Loading...</p>
      )}
    </main>
  );
}
