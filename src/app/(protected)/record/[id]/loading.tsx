export default function RecordLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header skeleton */}
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1">
            <div className="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-2 h-3 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
        {/* Tab skeleton */}
        <div className="mt-4 flex gap-3">
          <div className="h-8 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-8 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-8 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
      {/* Content skeleton */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-200 p-4 dark:border-gray-800"
            >
              <div className="mb-3 h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
