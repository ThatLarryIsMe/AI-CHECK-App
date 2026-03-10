"use client";

export function BookmarkletButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-lg border-2 border-brand-600 bg-brand-600/10 px-5 py-3 font-bold text-brand-400 transition hover:bg-brand-600/20"
      onClick={(e) => e.preventDefault()}
      title="Drag this to your bookmarks bar"
    >
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="text-brand-500">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Check with Factward
    </a>
  );
}
