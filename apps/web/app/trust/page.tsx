export default function TrustPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-16">
      <div className="max-w-3xl mx-auto space-y-10">
        <header className="space-y-4">
          <h1 className="text-4xl font-bold text-cyan-400">Trust & methodology</h1>
          <p className="text-slate-300">
            This page describes how ProofMode evaluates claims in its current LLM-only mode and what each result
            category represents.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Classification meanings</h2>
          <div className="space-y-3 text-slate-300">
            <p>
              <strong className="text-white">Supported:</strong> The model found internally consistent reasoning that
              aligns with the claim as written. This indicates strong support within the current evaluation context,
              not definitive ground truth.
            </p>
            <p>
              <strong className="text-white">Mixed:</strong> The model identified partial support alongside caveats,
              ambiguity, or conflicting interpretation. Mixed means the claim may be directionally reasonable but is not
              cleanly verifiable as stated.
            </p>
            <p>
              <strong className="text-white">Unsupported:</strong> The model could not produce adequate support for the
              claim, or identified clear issues with correctness or specificity. Unsupported does not imply intentional
              misinformation; it signals insufficient support in this workflow.
            </p>
          </div>
        </section>

        <section className="space-y-4 text-slate-300">
          <h2 className="text-2xl font-semibold text-slate-100">Current operating mode</h2>
          <p>
            ProofMode is not a real-time fact-checking service. It evaluates text using LLM reasoning in LLM-only mode.
            Outputs should be treated as structured analytical assistance, not as live verification against the open web.
          </p>
        </section>

        <section className="space-y-4 text-slate-300">
          <h2 className="text-2xl font-semibold text-slate-100">Data retention</h2>
          <p>Verification jobs and evidence packs are stored in our database.</p>
        </section>

        <section className="space-y-4 text-slate-300">
          <h2 className="text-2xl font-semibold text-slate-100">Forward plan</h2>
          <p>A web retrieval layer is planned for a future release to augment LLM-only assessments.</p>
        </section>
      </div>
    </main>
  );
}
