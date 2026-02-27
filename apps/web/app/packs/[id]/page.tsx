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

    function handleExportMarkdown() {
        window.location.href = `/api/packs/${params.id}/export.md`;
    }

    if (error) {
        return (
            <main className="mx-auto max-w-3xl px-6 py-12">
                <p className="text-red-400">{error}</p>
            </main>
        );
    }

    if (!pack) {
        return (
            <main className="mx-auto max-w-3xl px-6 py-12">
                <p className="text-slate-400">Loading evidence pack…</p>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-3xl px-6 py-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-cyan-400 mb-1">Evidence Pack</h1>
                    <p className="text-slate-500 text-sm">ID: {params.id}</p>
                </div>
                <button
                    onClick={handleExportMarkdown}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition text-sm"
                >
                    ↓ Export Markdown
                </button>
            </div>

            <ul className="space-y-6">
                {pack.claims.map((claim, i) => (
                    <li key={i} className="p-5 bg-slate-800 rounded-xl">
                        <p className="text-white font-medium mb-2">{claim.text}</p>
                        <div className="flex gap-4 text-sm">
                            <span className={STATUS_COLORS[claim.classification] ?? "text-slate-400"}>
                                {STATUS_LABELS[claim.classification] ?? claim.classification}
                            </span>
                            <span className="text-slate-400">Confidence: {claim.confidence}%</span>
                        </div>
                    </li>
                ))}
            </ul>
        </main>
    );
}
