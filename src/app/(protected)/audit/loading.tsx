export default function AuditLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <div className="flex items-center gap-3">
        <div className="h-10 w-40 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-10 w-60 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-gray-100 px-4 py-3 last:border-0 dark:border-gray-800/50">
            {["w-36", "w-24", "w-16", "w-28", "w-20"].map((w, j) => (
              <div key={j} className={`h-4 ${w} animate-pulse rounded bg-gray-100 dark:bg-gray-800`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
