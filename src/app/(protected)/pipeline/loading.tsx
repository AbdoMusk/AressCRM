export default function PipelineLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex w-72 min-w-[18rem] flex-col rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="border-b border-gray-200 p-3 dark:border-gray-800">
              <div className="h-5 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="space-y-2 p-3">
              {Array.from({ length: 2 + (i % 3) }).map((_, j) => (
                <div
                  key={j}
                  className="h-20 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
