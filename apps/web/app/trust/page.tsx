import Link from "next/link";

const sections = [
  { id: "pipeline", label: "Verification pipeline" },
  { id: "verdicts", label: "Verdicts" },
  { id: "confidence", label: "Confidence scores" },
  { id: "transparency", label: "Transparency" },
  { id: "limitations", label: "Limitations" },
  { id: "data", label: "Your data" },
];

const pipelineSteps = [
  {
    title: "Input processing",
    desc: "You submit text, a URL, or a PDF. For URLs, we fetch the page and extract readable text. For PDFs, we parse the document content. The raw text is then passed to claim extraction.",
  },
  {
    title: "Claim extraction",
    desc: "An AI model reads the text and identifies every distinct, verifiable factual statement. Opinions, questions, and subjective statements are filtered out. Each claim is made self-contained for independent verification.",
  },
  {
    title: "Evidence retrieval",
    desc: "Each extracted claim is searched against real-time web sources. Relevant source URLs, titles, and snippets are attached as evidence. This happens in parallel for all claims.",
  },
  {
    title: "Classification",
    desc: 'A conservative AI classifier evaluates each claim using both its knowledge and the retrieved evidence. It assigns a verdict and confidence score. The classifier defaults to "Mixed" when uncertain — designed to err on the side of caution.',
  },
  {
    title: "Trust Score & report",
    desc: "All results are compiled into a shareable report with an overall Trust Score. Supported claims score 100%, mixed 50%, and unsupported 0%. The report includes every claim, verdict, confidence score, and linked evidence.",
  },
];

export default function TrustPage() {
  return (
    <main className="px-6 py-12 md:py-16">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sticky sidebar TOC (desktop) */}
          <aside className="hidden lg:block w-48 shrink-0">
            <nav className="sticky top-24 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                On this page
              </p>
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block text-sm text-slate-400 hover:text-white transition"
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-16">
            {/* Header */}
            <header className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-400">
                Trust & methodology
              </p>
              <h1 className="text-display-sm md:text-display font-semibold text-white">
                How ProofMode works
              </h1>
              <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
                We believe you should never have to take a fact-check at face value.
                Here&apos;s exactly how ProofMode evaluates claims, what each verdict
                means, and what we can and can&apos;t do.
              </p>
            </header>

            {/* Pipeline */}
            <section id="pipeline" className="space-y-6">
              <h2 className="text-heading font-semibold text-white">
                The verification pipeline
              </h2>

              {/* Visual flow diagram */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-6">
                {["Input", "Extract claims", "Find evidence", "Classify", "Report"].map(
                  (step, i) => (
                    <span key={step} className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-brand-600/10 px-3 py-1 text-brand-400 font-medium">
                        {step}
                      </span>
                      {i < 4 && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-slate-600">
                          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                  )
                )}
              </div>

              <div className="space-y-6">
                {pipelineSteps.map((step, i) => (
                  <div key={step.title} className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600/10 text-sm font-bold text-brand-400">
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{step.title}</h3>
                      <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Verdicts */}
            <section id="verdicts" className="space-y-6">
              <h2 className="text-heading font-semibold text-white">
                What the verdicts mean
              </h2>
              <div className="space-y-4">
                <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-5">
                  <p className="font-medium text-green-400 mb-1.5">Supported</p>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    The claim is backed by consistent reasoning and, where available, by
                    retrieved evidence from credible sources. This is a strong signal,
                    though not a guarantee of absolute truth.
                  </p>
                </div>
                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-5">
                  <p className="font-medium text-yellow-400 mb-1.5">Mixed / Not Enough Info</p>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    The claim has partial support but also comes with caveats — conflicting
                    sources, ambiguous wording, or missing context. This is also the
                    default when the classifier is uncertain.
                  </p>
                </div>
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-5">
                  <p className="font-medium text-red-400 mb-1.5">Unsupported</p>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    We couldn&apos;t find adequate support for this claim, or found
                    evidence that contradicts it. This doesn&apos;t mean the claim is
                    intentionally false — it means it couldn&apos;t be verified with
                    available sources.
                  </p>
                </div>
              </div>
            </section>

            {/* Confidence */}
            <section id="confidence" className="space-y-4">
              <h2 className="text-heading font-semibold text-white">
                About confidence scores
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Each claim includes a confidence score (0-100%). This reflects the AI
                model&apos;s internal certainty about its classification — not an
                empirical probability. A 90% confidence on &quot;Supported&quot; means
                the model is quite sure, but it&apos;s still the model&apos;s judgment.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                Confidence scores are most useful for comparing claims within the same
                report. A claim rated &quot;Supported&quot; with 95% confidence is a
                stronger finding than one rated &quot;Supported&quot; at 60%.
              </p>
            </section>

            {/* Transparency */}
            <section id="transparency" className="space-y-4">
              <h2 className="text-heading font-semibold text-white">
                Our approach to transparency
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Every verdict comes with the evidence and reasoning that produced it.
                You can see exactly which sources were consulted, what snippets were
                extracted, and the confidence behind each classification.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                ProofMode is a tool to help you think critically — not a replacement for
                it. We show our work so you can form your own judgment.
              </p>
            </section>

            {/* Limitations */}
            <section id="limitations" className="space-y-4">
              <h2 className="text-heading font-semibold text-white">
                Known limitations
              </h2>
              <div className="rounded-lg border border-surface-800/60 bg-surface-900 p-5 text-sm text-slate-400 space-y-2">
                <p>
                  ProofMode is a powerful analytical tool, but it has limitations you
                  should be aware of:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 leading-relaxed">
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
            <section id="data" className="space-y-4">
              <h2 className="text-heading font-semibold text-white">Your data</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Verification jobs and reports are stored securely in our database. Your
                submissions are used only to produce your results — never sold or shared
                with third parties. Verification reports can be shared via public links,
                but only you can see them in your dashboard.
              </p>
            </section>

            {/* CTA */}
            <div className="border-t border-surface-800/60 pt-10 text-center">
              <p className="text-slate-400 mb-5">Ready to try it?</p>
              <Link
                href="/verify"
                className="inline-block rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white transition hover:bg-brand-500"
              >
                Check your first claim
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
