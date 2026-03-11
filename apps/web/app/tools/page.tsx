import { getSessionFromCookie } from "@/lib/auth";
import Link from "next/link";
import { BookmarkletButton } from "./bookmarklet-button";

export default async function ToolsPage() {
  const user = await getSessionFromCookie();
  const isPro = user?.plan === "pro" && user?.planStatus === "active";

  const bookmarkletCode = `javascript:void(window.open('${process.env.NEXT_PUBLIC_APP_URL || ''}/verify?url='+encodeURIComponent(location.href),'_blank'))`;

  return (
    <main className="px-4 py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-400">
          Tools
        </p>
        <h1 className="mb-2 text-display-sm font-semibold text-white">
          Verify without breaking your workflow
        </h1>
        <p className="mb-10 text-lg text-slate-400">
          One-click fact-checking from any page you&apos;re reading, plus API access
          to build verification into your publishing pipeline.
        </p>

        {/* Bookmarklet */}
        <section className="mb-8 rounded-xl border border-surface-800/60 bg-surface-900 p-6">
          <h2 className="mb-3 text-xl font-semibold text-white">
            Bookmarklet — Fact-Check Any Page in One Click
          </h2>
          <p className="mb-4 text-sm text-slate-400">
            Reading an article that seems off? Click the bookmarklet and get a full
            verification report without copy-pasting anything.
          </p>

          <div className="mb-6 flex items-center gap-4">
            <BookmarkletButton href={bookmarkletCode} />
            <span className="text-xs text-slate-500">
              ← Drag this to your bookmarks bar
            </span>
          </div>

          <div className="rounded-lg bg-surface-800 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              How it works
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-300">
              <li>Drag the button to your browser&apos;s bookmarks bar</li>
              <li>Visit any article or webpage</li>
              <li>Click &quot;Check with Factward&quot; in your bookmarks</li>
              <li>Factward opens with the article text pre-loaded</li>
              <li>Get your verification report in seconds</li>
            </ol>
          </div>
        </section>

        {/* API Access */}
        <section className="mb-8 rounded-xl border border-surface-800/60 bg-surface-900 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="mb-3 text-xl font-semibold text-white">
                API Access
                {!isPro && (
                  <span className="ml-2 rounded bg-brand-600/20 px-2 py-0.5 text-xs font-bold text-brand-400">
                    PRO
                  </span>
                )}
              </h2>
              <p className="mb-4 text-sm text-slate-400">
                Build fact-checking into your CMS, publishing pipeline, or content
                review process. Submit text programmatically, get structured evidence packs back.
              </p>
            </div>
          </div>

          {isPro ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-surface-800 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
            <div className="rounded-lg border border-surface-800/60 bg-surface-800/50 p-4 text-center">
              <p className="mb-3 text-sm text-slate-400">
                API access is available on the Pro plan.
              </p>
              <Link
                href="/pricing"
                className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
              >
                Upgrade to Pro
              </Link>
            </div>
          )}
        </section>

        {/* Browser Extension teaser */}
        <section className="rounded-xl border border-dashed border-slate-700 bg-surface-900/50 p-6 text-center">
          <h2 className="mb-2 text-lg font-semibold text-white">
            Chrome Extension — Coming Soon
          </h2>
          <p className="text-sm text-slate-400">
            Inline fact-checking as you read. Highlights claims directly on the page
            with verdicts and sources. Sign up to get early access.
          </p>
        </section>
      </div>
    </main>
  );
}
