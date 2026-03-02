export default function TrustPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-16">
      <div className="max-w-3xl mx-auto space-y-12">
        <header className="space-y-4">
          <h1 className="text-4xl font-bold text-cyan-400">How ProofMode works</h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            We believe you should never have to take a fact-check at face value.
            Here&apos;s exactly how ProofMode evaluates claims, what each verdict means,
            and where we&apos;re headed next.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">The process</h2>
          <div className="space-y-3 text-slate-300 leading-relaxed">
            <p>
              When you submit text, ProofMode runs a three-step pipeline:
            </p>
            <ol className="list-decimal list-inside space-y-2 pl-2">
              <li>
                <strong className="text-white">Claim extraction</strong> — AI reads your text and pulls out
                every distinct factual statement. Opinions and subjective language are filtered out.
              </li>
              <li>
                <strong className="text-white">Evidence search</strong> — each claim is searched against
                real-time web sources via Brave Search. When relevant results are found, they&apos;re attached
                as supporting or contradicting evidence.
              </li>
              <li>
                <strong className="text-white">Classification</strong> — using both LLM reasoning and
                retrieved evidence, each claim receives a verdict: Supported, Mixed, or Unsupported.
              </li>
            </ol>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">What the verdicts mean</h2>
          <div className="space-y-4 text-slate-300 leading-relaxed">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <p className="font-semibold text-green-400 mb-1">Supported</p>
              <p>
                The claim is backed by consistent reasoning and, where available, by retrieved evidence
                from credible sources. This is a strong signal, though not a guarantee of absolute truth.
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <p className="font-semibold text-yellow-400 mb-1">Mixed</p>
              <p>
                The claim has partial support but also comes with caveats — conflicting sources,
                ambiguous wording, or missing context. It may be directionally correct but can&apos;t
                be cleanly verified as stated.
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <p className="font-semibold text-red-400 mb-1">Unsupported</p>
              <p>
                We couldn&apos;t find adequate support for this claim, or found evidence that
                contradicts it. This doesn&apos;t mean the claim is intentionally false — it means
                we can&apos;t verify it with available sources.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4 text-slate-300 leading-relaxed">
          <h2 className="text-2xl font-semibold text-slate-100">Our approach to transparency</h2>
          <p>
            Every verdict comes with the evidence and reasoning that produced it.
            You can see exactly which sources were consulted, what quotes were extracted,
            and how the AI reached its conclusion. We show our work so you can make
            your own judgment.
          </p>
          <p>
            ProofMode is a tool to help you think critically — not a replacement for it.
            Treat results as structured analytical assistance, not definitive truth.
          </p>
        </section>

        <section className="space-y-4 text-slate-300 leading-relaxed">
          <h2 className="text-2xl font-semibold text-slate-100">Your data</h2>
          <p>
            Verification jobs and reports are stored securely in our database.
            Your submissions are used only to produce your results — never sold or
            shared with third parties.
          </p>
        </section>

        <section className="space-y-4 text-slate-300 leading-relaxed">
          <h2 className="text-2xl font-semibold text-slate-100">What&apos;s next</h2>
          <p>
            We&apos;re continuously improving evidence coverage, confidence calibration,
            and source diversity. Future updates will include additional retrieval sources
            beyond web search, better handling of nuanced claims, and team collaboration features.
          </p>
        </section>
      </div>
    </main>
  );
}
