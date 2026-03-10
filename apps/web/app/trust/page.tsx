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
    desc: "You submit text, a URL, or a PDF. For URLs, we fetch the page and extract readable content. For PDFs, we parse the document. The text is then passed to claim extraction.",
  },
  {
    title: "Claim extraction",
    desc: "An AI model reads your text and identifies every distinct, verifiable factual statement. Opinions, predictions, and subjective statements are filtered out. Each extracted claim is validated against the original text to prevent fabrication.",
  },
  {
    title: "Evidence retrieval",
    desc: "For each claim, we generate optimized search queries and retrieve evidence from multiple web sources. Each claim gets up to 5 independent sources from different angles — not just one search.",
  },
  {
    title: "Evidence-grounded classification",
    desc: 'The classifier sees ONLY the retrieved evidence — never its own internal knowledge. It must cite specific sources in its reasoning. If no relevant evidence exists, the claim is marked "Insufficient Evidence" with 0% confidence. We never guess.',
  },
  {
    title: "Trust Score & report",
    desc: "Results are compiled into a shareable report. The Trust Score is calculated only from verifiable claims — unverifiable claims are excluded so they don't inflate or deflate your score. Every claim shows its verdict, confidence, reasoning, and linked sources.",
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
                Most fact-checking tools are black boxes. We think that defeats the purpose.
                Here&apos;s exactly how ProofMode works, what each verdict means, and where
                our limitations are. Full transparency — because a fact-checker you can&apos;t
                verify is just another source of trust you have to take on faith.
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
                    Retrieved evidence directly and explicitly confirms this claim. The
                    classifier cites which sources support it in its reasoning. Confidence
                    reflects evidence strength — a single source caps at 70%.
                  </p>
                </div>
                <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-5">
                  <p className="font-medium text-orange-400 mb-1.5">Conflicting Sources</p>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Multiple sources were found, but they genuinely disagree. Some evidence
                    supports the claim while other evidence contradicts it. The reasoning
                    explains which sources say what.
                  </p>
                </div>
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-5">
                  <p className="font-medium text-red-400 mb-1.5">Refuted</p>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Retrieved evidence directly and explicitly contradicts this claim. The
                    reasoning cites which sources disprove it. This doesn&apos;t mean the
                    claim is intentionally false — only that available evidence contradicts it.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-500/20 bg-slate-500/5 p-5">
                  <p className="font-medium text-slate-300 mb-1.5">Insufficient Evidence</p>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    We couldn&apos;t find enough relevant evidence to verify or refute this
                    claim. Rather than guess, we flag it honestly. This is the default — a
                    claim is &quot;insufficient&quot; until evidence proves otherwise.
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
                Confidence reflects how strongly the retrieved evidence supports the
                verdict — not an abstract AI &quot;feeling.&quot; The scale is calibrated to
                evidence quality: 0% means no evidence, 10-30% means weak or indirect,
                40-60% means moderate single-source, 70-80% means strong multi-source,
                and 90-100% means overwhelming agreement from multiple independent sources.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                Importantly, confidence is capped at 70% when only a single source is
                available. We never report high confidence from thin evidence.
              </p>
            </section>

            {/* Transparency */}
            <section id="transparency" className="space-y-4">
              <h2 className="text-heading font-semibold text-white">
                Our approach to transparency
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Every verdict includes the reasoning behind it, citing specific sources
                by number. You can click through to every source, read the snippets, and
                decide for yourself whether you agree with our assessment.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                ProofMode is a tool to help you think critically — not a replacement for
                it. We show our work so you can verify the verifier.
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
                  <li>Claims are verified against web sources — niche, paywalled, or very recent claims may lack evidence and will be flagged as &quot;Insufficient&quot;</li>
                  <li>The AI classifier bases verdicts only on retrieved evidence, but can still misinterpret snippets, especially for nuanced or domain-specific claims</li>
                  <li>Search snippets shown in reports are summaries from the search engine, not direct quotes from the source page</li>
                  <li>Satire, sarcasm, and figurative language may be misinterpreted as factual claims</li>
                  <li>Evidence quality depends on what is available on the open web at the time of verification</li>
                  <li>ProofMode is a verification aid, not a replacement for professional fact-checking in legal, medical, or financial contexts</li>
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
              <p className="text-slate-400 mb-5">See it for yourself — paste any text and get a full verification report.</p>
              <Link
                href="/verify"
                className="inline-block rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white transition hover:bg-brand-500"
              >
                Try It Free
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
