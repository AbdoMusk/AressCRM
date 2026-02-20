export default function MarketplaceLoading() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-64 animate-pulse rounded-md bg-gray-200 dark:bg-gray-800" />
          <div className="h-5 w-40 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
        </div>

        {/* Cards grid skeleton */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-3 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="mt-4 flex gap-3">
                <div className="h-4 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-4 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
