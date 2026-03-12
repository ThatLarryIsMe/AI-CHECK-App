export default function ReportLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
        <p className="mt-4 animate-pulse text-slate-400">Loading report…</p>
      </div>
    </main>
  );
}
