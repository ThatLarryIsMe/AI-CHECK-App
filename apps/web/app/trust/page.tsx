import Link from "next/link";

export default function TrustPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-16">
      <div className="max-w-3xl mx-auto space-y-12">
        <header className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Trust &amp; methodology
          </p>
          <h1 className="text-4xl font-bold text-white">How ProofMode works</h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            We believe you should never have to take a fact-check at face value.
            Here&apos;s exactly how ProofMode evaluates claims, what each verdict means,
            and what we can and can&apos;t do.
          </p>
        </header>

        {/* Pipeline */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">The verification pipeline</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-bold text-cyan-400">
                1
              </div>
              <div>
                <h3 className="font-semibold text-white">Input processing</h3>
                <p className="text-slate-300 text-sm mt-1">
                  You submit text, a URL, or a PDF. For URLs, we fetch the page server-side
                  and extract readable text. For PDFs, we parse the document and extract text content.
                  The raw text is then passed to the claim extraction step.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-bold text-cyan-400">
                2
              </div>
              <div>
                <h3 className="font-semibold text-white">Claim extraction</h3>
                <p className="text-slate-300 text-sm mt-1">
                  An AI model reads the text and identifies every distinct, verifiable factual statement.
                  Opinions, questions, predictions, and subjective statements are filtered out.
                  Each claim is made self-contained so it can be verified independently.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-bold text-cyan-400">
                3
              </div>
              <div>
                <h3 className="font-semibold text-white">Evidence retrieval</h3>
                <p className="text-slate-300 text-sm mt-1">
                  Each extracted claim is searched against real-time web sources via the Brave Search API.
                  When relevant results are found, source URLs, titles, and relevant snippets are
                  attached as evidence. This happens in parallel for all claims.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-bold text-cyan-400">
                4
              </div>
              <div>
                <h3 className="font-semibold text-white">Classification</h3>
                <p className="text-slate-300 text-sm mt-1">
                  A conservative AI classifier evaluates each claim using both its internal knowledge
                  and the retrieved evidence. It assigns a verdict (Supported, Mixed, or Unsupported)
                  and a confidence score. The classifier defaults to &quot;Mixed&quot; when uncertain —
                  it is designed to err on the side of caution.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-bold text-cyan-400">
                5
              </div>
              <div>
                <h3 className="font-semibold text-white">Trust Score &amp; report</h3>
                <p className="text-slate-300 text-sm mt-1">
                  All results are compiled into a shareable verification report with an overall
                  Trust Score. The score is a weighted average: supported claims score 100%,
                  mixed claims 50%, and unsupported claims 0%. The report includes every claim,
                  verdict, confidence score, and linked evidence.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Verdicts */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">What the verdicts mean</h2>
          <div className="space-y-4">
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
              <p className="font-semibold text-green-400 mb-1">Supported</p>
              <p className="text-sm text-slate-300">
                The claim is backed by consistent reasoning and, where available, by retrieved evidence
                from credible sources. This is a strong signal, though not a guarantee of absolute truth.
              </p>
            </div>
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
              <p className="font-semibold text-yellow-400 mb-1">Mixed / Not Enough Info</p>
              <p className="text-sm text-slate-300">
                The claim has partial support but also comes with caveats — conflicting sources,
                ambiguous wording, or missing context. It may be directionally correct but can&apos;t
                be cleanly verified as stated. This is also the default when the classifier is uncertain.
              </p>
            </div>
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <p className="font-semibold text-red-400 mb-1">Unsupported</p>
              <p className="text-sm text-slate-300">
                We couldn&apos;t find adequate support for this claim, or found evidence that
                contradicts it. This doesn&apos;t mean the claim is intentionally false — it means
                it couldn&apos;t be verified with available sources.
              </p>
            </div>
          </div>
        </section>

        {/* Confidence */}
        <section className="space-y-4 text-slate-300 leading-relaxed">
          <h2 className="text-2xl font-semibold text-slate-100">About confidence scores</h2>
          <p className="text-sm">
            Each claim includes a confidence score (0-100%). This reflects the AI model&apos;s
            internal certainty about its classification — not an empirical probability.
            A 90% confidence on &quot;Supported&quot; means the model is quite sure the claim
            is well-supported, but it&apos;s still the model&apos;s judgment, not a statistical fact.
          </p>
          <p className="text-sm">
            Confidence scores are most useful for comparing claims within the same report.
            A claim rated &quot;Supported&quot; with 95% confidence is a stronger finding than one
            rated &quot;Supported&quot; at 60%.
          </p>
        </section>

        {/* Transparency */}
        <section className="space-y-4 text-slate-300 leading-relaxed">
          <h2 className="text-2xl font-semibold text-slate-100">Our approach to transparency</h2>
          <p className="text-sm">
            Every verdict comes with the evidence and reasoning that produced it.
            You can see exactly which sources were consulted, what snippets were extracted,
            and the confidence behind each classification.
          </p>
          <p className="text-sm">
            ProofMode is a tool to help you think critically — not a replacement for it.
            We show our work so you can form your own judgment.
          </p>
        </section>

        {/* Limitations */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-100">Known limitations</h2>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300 space-y-2">
            <p>ProofMode is a powerful analytical tool, but it has limitations you should be aware of:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Claims are verified against web sources — niche or very recent claims may lack evidence</li>
              <li>The AI classifier can be wrong, especially on nuanced or domain-specific claims</li>
              <li>Confidence scores are model-internal estimates, not calibrated probabilities</li>
              <li>Satire, sarcasm, and figurative language may be misinterpreted as factual claims</li>
              <li>Evidence quality depends on what&apos;s available on the open web at verification time</li>
              <li>Results should not be used as a substitute for professional fact-checking in legal, medical, or financial contexts</li>
            </ul>
          </div>
        </section>

        {/* Data */}
        <section className="space-y-4 text-slate-300 leading-relaxed">
          <h2 className="text-2xl font-semibold text-slate-100">Your data</h2>
          <p className="text-sm">
            Verification jobs and reports are stored securely in our database.
            Your submissions are used only to produce your results — never sold or
            shared with third parties. Verification reports can be shared via public
            links (pack UUIDs), but only you can see them in your dashboard.
          </p>
        </section>

        {/* Stack */}
        <section className="space-y-4 text-slate-300 leading-relaxed">
          <h2 className="text-2xl font-semibold text-slate-100">Technology stack</h2>
          <p className="text-sm">
            ProofMode uses OpenAI&apos;s GPT-4o-mini for claim extraction and classification,
            Brave Search API for real-time evidence retrieval, and Postgres for data storage.
            The verification engine runs each step with independent timeouts and graceful
            degradation — if evidence retrieval fails, claims are still classified using the
            model&apos;s internal knowledge.
          </p>
        </section>

        {/* CTA */}
        <div className="border-t border-slate-800 pt-8 text-center">
          <p className="text-slate-400 mb-4">
            Have questions about our methodology?
          </p>
          <Link
            href="/verify"
            className="inline-block rounded-lg bg-cyan-500 px-6 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Try it yourself
          </Link>
        </div>
      </div>
    </main>
  );
}
