export default function ObjectsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <div className="flex gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800"
          />
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-800">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-gray-200 p-4 dark:border-gray-800"
          >
            <div className="h-4 w-1/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
