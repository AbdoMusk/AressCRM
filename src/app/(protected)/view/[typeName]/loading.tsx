export default function ViewLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-3 dark:border-gray-800">
        <div className="h-4 w-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2 dark:border-gray-800">
        <div className="h-7 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-7 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-7 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      </div>
      {/* Table skeleton */}
      <div className="flex-1 overflow-hidden p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 border-b border-gray-100 py-3 dark:border-gray-800/50"
          >
            <div className="h-4 w-8 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-4 w-40 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-4 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-4 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-4 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
