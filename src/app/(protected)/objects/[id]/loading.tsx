export default function ObjectDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div>
          <div className="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="mt-1 h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800"
          />
        ))}
      </div>
      {[1, 2].map((i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"
        />
      ))}
    </div>
  );
}
