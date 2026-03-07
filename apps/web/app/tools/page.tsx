import { getSessionFromCookie } from "@/lib/auth";
import Link from "next/link";

export default async function ToolsPage() {
  const user = await getSessionFromCookie();
  const isPro = user?.plan === "pro" && user?.planStatus === "active";

  // The bookmarklet navigates to /verify?url=<current page URL>
  const bookmarkletCode = `javascript:void(window.open('${process.env.NEXT_PUBLIC_APP_URL || ''}/verify?url='+encodeURIComponent(location.href),'_blank'))`;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-cyan-400">
          Tools
        </p>
        <h1 className="mb-2 text-3xl font-bold text-white">
          Fact-check from anywhere
        </h1>
        <p className="mb-10 text-lg text-slate-400">
          Use these tools to verify content without leaving the page you&apos;re reading.
        </p>

        {/* Bookmarklet */}
        <section className="mb-10 rounded-xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="mb-3 text-xl font-bold text-white">
            Bookmarklet — One-Click Fact Check
          </h2>
          <p className="mb-4 text-sm text-slate-400">
            Drag the button below to your bookmarks bar. Click it on any article
            to instantly fact-check the page with ProofMode.
          </p>

          <div className="mb-6 flex items-center gap-4">
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a
              href={bookmarkletCode}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-cyan-500 bg-cyan-500/10 px-5 py-3 font-bold text-cyan-400 transition hover:bg-cyan-500/20"
              onClick={(e) => e.preventDefault()}
              title="Drag this to your bookmarks bar"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#22d3ee" strokeWidth="1.5" />
                <path d="M5 8l2 2 4-4" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Check with ProofMode
            </a>
            <span className="text-xs text-slate-500">
              ← Drag this to your bookmarks bar
            </span>
          </div>

          <div className="rounded-lg bg-slate-800 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              How it works
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-300">
              <li>Drag the button to your browser&apos;s bookmarks bar</li>
              <li>Visit any article or webpage</li>
              <li>Click &quot;Check with ProofMode&quot; in your bookmarks</li>
              <li>ProofMode opens with the article text pre-loaded</li>
              <li>Get your verification report in seconds</li>
            </ol>
          </div>
        </section>

        {/* API Access */}
        <section className="mb-10 rounded-xl border border-slate-700 bg-slate-900 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="mb-3 text-xl font-bold text-white">
                API Access
                {!isPro && (
                  <span className="ml-2 rounded bg-cyan-500/20 px-2 py-0.5 text-xs font-bold text-cyan-400">
                    PRO
                  </span>
                )}
              </h2>
              <p className="mb-4 text-sm text-slate-400">
                Integrate ProofMode into your workflow with our REST API.
                Submit text programmatically and get structured verification results.
              </p>
            </div>
          </div>

          {isPro ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-800 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Example request
                </p>
                <pre className="overflow-x-auto text-sm text-slate-300">
{`curl -X POST /api/verify \\
  -H "Content-Type: application/json" \\
  -H "Cookie: pm_session=YOUR_TOKEN" \\
  -d '{"text": "The Earth is 4.5 billion years old."}'`}
                </pre>
              </div>
              <p className="text-xs text-slate-500">
                API key authentication coming soon. Currently uses session cookies.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
              <p className="mb-3 text-sm text-slate-400">
                API access is available on the Pro plan.
              </p>
              <Link
                href="/pricing"
                className="inline-block rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Upgrade to Pro
              </Link>
            </div>
          )}
        </section>

        {/* Browser Extension teaser */}
        <section className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-6 text-center">
          <h2 className="mb-2 text-lg font-bold text-white">
            Browser Extension — Coming Soon
          </h2>
          <p className="text-sm text-slate-400">
            We&apos;re building a Chrome extension that fact-checks articles as you
            read them. Stay tuned.
          </p>
        </section>
      </div>
    </main>
  );
}
